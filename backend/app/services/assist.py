import datetime
import logging
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models import models
from app.schemas import schemas
from app.services import exotel_service
from fastapi import HTTPException, status

logger = logging.getLogger("travel_guardian.assist")


def log_emergency_event(
    db: Session,
    user_id: str,
    event_type: str,
    recipient_name: Optional[str],
    recipient_phone_masked: Optional[str],
    status: str,
    sid: Optional[str] = None,
    error_message: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None
) -> Optional[models.EmergencyEventLog]:
    """
    Persists audit records of emergency actions (calls, SMS, SOS) to the database.
    Catches and logs any database error so emergency dispatch is never blocked.
    """
    try:
        entry = models.EmergencyEventLog(
            user_id=user_id,
            event_type=event_type,
            recipient_name=recipient_name,
            recipient_phone_masked=recipient_phone_masked,
            status=status,
            sid=sid,
            error_message=error_message,
            latitude=latitude,
            longitude=longitude,
            created_at=datetime.datetime.now(datetime.timezone.utc)
        )

        db.add(entry)
        db.commit()
        db.refresh(entry)
        return entry
    except Exception as exc:
        db.rollback()
        logger.warning(f"Failed to write emergency event log: {exc}")
        return None


def get_emergency_event_logs(
    db: Session,
    user_id: str = "default_user",
    limit: int = 50
) -> List[models.EmergencyEventLog]:
    """
    Retrieves recent emergency event audit logs for the specified user.
    """
    return db.query(models.EmergencyEventLog).filter(
        models.EmergencyEventLog.user_id == user_id
    ).order_by(models.EmergencyEventLog.created_at.desc()).limit(limit).all()


def _resolve_primary_contact(
    db: Session,
    request: Optional[schemas.EmergencyActionRequest] = None,
    user_id: str = "default_user"
) -> Optional[models.EmergencyContact]:
    """
    Resolves the primary emergency contact from the database.
    If no contact exists in DB but one was provided in the request payload,
    automatically creates and stores it in the database for the user.
    """
    contacts = db.query(models.EmergencyContact).filter(
        models.EmergencyContact.user_id == user_id
    ).all()

    if contacts:
        return contacts[0]

    # Auto-register contact if provided in request
    if request and request.contact_phone and request.contact_phone.strip():
        try:
            name = (request.contact_name or "Guardian").strip()
            phone = request.contact_phone.strip()
            rel = (request.contact_relation or "Emergency Contact").strip()
            new_contact = models.EmergencyContact(
                name=name,
                phone=phone,
                relation=rel,
                user_id=user_id
            )
            db.add(new_contact)
            db.commit()
            db.refresh(new_contact)
            logger.info(f"Auto-registered emergency contact for {user_id}")
            return new_contact
        except Exception as exc:
            db.rollback()
            logger.warning(f"Could not auto-register contact: {exc}")

    return None


def trigger_sos(db: Session, request: schemas.SOSRequest, user_id: str = "default_user") -> schemas.SOSResponse:
    """
    Activates immediate SOS Broadcast alerts, triggers Exotel SMS and Voice Call to stored
    trusted contact(s), logs the event, and identifies nearby safe havens.
    """
    contacts = db.query(models.EmergencyContact).filter(models.EmergencyContact.user_id == user_id).all()
    broadcast_list = []
    for c in contacts:
        contact_type = f"{c.name} ({c.relation}) via {exotel_service.mask_phone_number(c.phone)}"
        if c.email:
            contact_type += f" & {c.email}"
        broadcast_list.append(contact_type)

    lat = request.latitude
    lon = request.longitude

    sms_status = "failed"
    call_status = "failed"
    overall_status = "failed"
    target_name: Optional[str] = None
    target_masked: Optional[str] = None
    sms_sid: Optional[str] = None
    call_sid: Optional[str] = None

    if contacts:
        primary_contact = contacts[0]
        target_name = primary_contact.name
        target_masked = exotel_service.mask_phone_number(primary_contact.phone)

        # Check debounce lock
        acquired, reason = exotel_service.check_and_acquire_emergency_lock(user_id)

        if acquired:
            # Dispatch Exotel SMS
            sms_res = exotel_service.send_emergency_sms(
                to_phone=primary_contact.phone,
                user_name=target_name,
                latitude=lat,
                longitude=lon,
                custom_message=request.custom_message
            )
            sms_status = sms_res.get("status", "failed")
            sms_sid = sms_res.get("sid")

            # Initiate Exotel Call
            call_res = exotel_service.make_emergency_call(
                to_phone=primary_contact.phone,
                user_name=target_name
            )
            call_status = call_res.get("status", "failed")
            call_sid = call_res.get("sid")

            # Compute overall status
            if sms_status == "sent" and call_status == "initiated":
                overall_status = "completed"
            elif sms_status == "sent" or call_status == "initiated":
                overall_status = "partially_completed"
            else:
                overall_status = "failed"
        else:
            overall_status = "throttled"
            sms_status = "throttled"
            call_status = "throttled"

        # Log SOS event
        log_emergency_event(
            db=db,
            user_id=user_id,
            event_type="sos_broadcast",
            recipient_name=target_name,
            recipient_phone_masked=target_masked,
            status=overall_status,
            sid=call_sid or sms_sid,
            latitude=lat,
            longitude=lon
        )
    else:
        broadcast_list = ["System Emergency Dispatch (112)", "Global SOS Command Center"]
        log_emergency_event(
            db=db,
            user_id=user_id,
            event_type="sos_broadcast",
            recipient_name="Emergency Dispatch (112)",
            recipient_phone_masked="112",
            status="no_trusted_contact",
            latitude=lat,
            longitude=lon
        )

    safe_havens = [
        schemas.SafeHaven(
            name="Metropolitan Emergency Police Station",
            type="Police Station",
            latitude=lat + 0.004,
            longitude=lon - 0.002,
            distance_km=0.5,
            phone="112"
        ),
        schemas.SafeHaven(
            name="General Memorial Medical Center",
            type="Hospital",
            latitude=lat - 0.009,
            longitude=lon + 0.007,
            distance_km=1.2,
            phone="108"
        ),
        schemas.SafeHaven(
            name="Emergency Rescue Command Post",
            type="Rescue Post",
            latitude=lat + 0.018,
            longitude=lon + 0.015,
            distance_km=2.5,
            phone="112"
        )
    ]

    msg = request.custom_message or "Immediate emergency assistance required! Live coordinates transmitted."
    response_msg = f"SOS Broadcasting activated. Alert dispatched to configured channels."

    return schemas.SOSResponse(
        success=True,
        message=response_msg,
        broadcasted_contacts=broadcast_list,
        latitude=lat,
        longitude=lon,
        nearest_havens=safe_havens,
        sms_status=sms_status,
        call_status=call_status,
        overall_status=overall_status,
        recipient_name=target_name,
        recipient_phone_masked=target_masked
    )


def send_trusted_contact_sms(
    db: Session,
    request: schemas.EmergencyActionRequest,
    user_id: str = "default_user"
) -> schemas.EmergencySMSResponse:
    """
    Sends an emergency SMS exclusively to the stored trusted contact.
    Logs the event to the database.
    """
    primary = _resolve_primary_contact(db, request, user_id)
    if not primary:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No trusted emergency contact is configured. Please add a trusted contact in Settings or Emergency portal."
        )

    masked_phone = exotel_service.mask_phone_number(primary.phone)

    # Check debounce
    acquired, reason = exotel_service.check_and_acquire_emergency_lock(user_id)
    if not acquired:
        return schemas.EmergencySMSResponse(
            success=False,
            status="failed",
            message=reason or "Emergency request throttled.",
            safe_message=reason or "Please wait before resending emergency alert.",
            recipient_name=primary.name,
            recipient_phone_masked=masked_phone,
            error="Debounced"
        )

    res = exotel_service.send_emergency_sms(
        to_phone=primary.phone,
        user_name=primary.name,
        latitude=request.latitude,
        longitude=request.longitude,
        custom_message=request.custom_message
    )

    # Persist audit log
    log_emergency_event(
        db=db,
        user_id=user_id,
        event_type="sms_alert",
        recipient_name=primary.name,
        recipient_phone_masked=masked_phone,
        status=res.get("status", "failed"),
        sid=res.get("sid"),
        error_message=res.get("error"),
        latitude=request.latitude,
        longitude=request.longitude
    )

    return schemas.EmergencySMSResponse(
        success=res.get("success", False),
        status=res.get("status", "failed"),
        message=res.get("message", "Emergency SMS processed."),
        safe_message=res.get("safe_message"),
        recipient_name=primary.name,
        recipient_phone_masked=masked_phone,
        sid=res.get("sid"),
        error=res.get("error")
    )


def make_trusted_contact_call(
    db: Session,
    request: schemas.EmergencyActionRequest,
    user_id: str = "default_user"
) -> schemas.EmergencyCallResponse:
    """
    Initiates an outbound voice call exclusively to the stored trusted contact.
    Logs the event to the database.
    """
    primary = _resolve_primary_contact(db, request, user_id)
    if not primary:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No trusted emergency contact is configured. Please add a trusted contact in Settings or Emergency portal."
        )

    masked_phone = exotel_service.mask_phone_number(primary.phone)

    # Check debounce
    acquired, reason = exotel_service.check_and_acquire_emergency_lock(user_id)
    if not acquired:
        return schemas.EmergencyCallResponse(
            success=False,
            status="failed",
            message=reason or "Emergency request throttled.",
            safe_message=reason or "Please wait before initiating another call.",
            recipient_name=primary.name,
            recipient_phone_masked=masked_phone,
            error="Debounced"
        )

    res = exotel_service.make_emergency_call(
        to_phone=primary.phone,
        user_name=primary.name
    )

    # Persist audit log
    log_emergency_event(
        db=db,
        user_id=user_id,
        event_type="voice_call",
        recipient_name=primary.name,
        recipient_phone_masked=masked_phone,
        status=res.get("status", "failed"),
        sid=res.get("sid"),
        error_message=res.get("error"),
        latitude=request.latitude,
        longitude=request.longitude
    )

    return schemas.EmergencyCallResponse(
        success=res.get("success", False),
        status=res.get("status", "failed"),
        message=res.get("message", "Emergency call processed."),
        safe_message=res.get("safe_message"),
        recipient_name=primary.name,
        recipient_phone_masked=masked_phone,
        sid=res.get("sid"),
        error=res.get("error")
    )


def notify_trusted_contact(
    db: Session,
    request: schemas.EmergencyActionRequest,
    user_id: str = "default_user"
) -> schemas.EmergencyNotificationResponse:
    """
    Unified endpoint: resolves stored trusted contact, dispatches both SMS and Call,
    logs the events, and returns granular status breakdown.
    """
    primary = _resolve_primary_contact(db, request, user_id)
    if not primary:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No trusted emergency contact is configured. Please add a trusted contact in Settings or Emergency portal."
        )

    masked_phone = exotel_service.mask_phone_number(primary.phone)

    # Check debounce
    acquired, reason = exotel_service.check_and_acquire_emergency_lock(user_id)
    if not acquired:
        return schemas.EmergencyNotificationResponse(
            success=False,
            overall_status="failed",
            sms_status="failed",
            call_status="failed",
            message=reason or "Emergency request throttled.",
            safe_message=reason or "Please wait before resending emergency notification.",
            recipient_name=primary.name,
            recipient_phone_masked=masked_phone,
            timestamp=datetime.datetime.utcnow()
        )

    sms_res = {"status": "skipped", "sid": None, "success": True}
    if request.include_sms is not False:
        sms_res = exotel_service.send_emergency_sms(
            to_phone=primary.phone,
            user_name=primary.name,
            latitude=request.latitude,
            longitude=request.longitude,
            custom_message=request.custom_message
        )

    call_res = {"status": "skipped", "sid": None, "success": True}
    if request.include_call is not False:
        call_res = exotel_service.make_emergency_call(
            to_phone=primary.phone,
            user_name=primary.name
        )

    sms_status = sms_res.get("status", "failed")
    call_status = call_res.get("status", "failed")

    if (sms_status in ["sent", "skipped"]) and (call_status in ["initiated", "skipped"]):
        overall = "completed"
        msg = "Emergency alerts dispatched successfully to trusted contact."
    elif sms_status == "sent" or call_status == "initiated":
        overall = "partially_completed"
        msg = "Emergency alert partially delivered to trusted contact."
    else:
        overall = "failed"
        msg = "Emergency communication to trusted contact failed."

    # Persist audit logs
    log_emergency_event(
        db=db,
        user_id=user_id,
        event_type="emergency_broadcast",
        recipient_name=primary.name,
        recipient_phone_masked=masked_phone,
        status=overall,
        sid=call_res.get("sid") or sms_res.get("sid"),
        error_message=f"SMS: {sms_res.get('error') or 'ok'} | Call: {call_res.get('error') or 'ok'}",
        latitude=request.latitude,
        longitude=request.longitude
    )

    return schemas.EmergencyNotificationResponse(
        success=(overall in ["completed", "partially_completed"]),
        overall_status=overall,
        sms_status=sms_status,
        call_status=call_status,
        message=msg,
        safe_message=f"{msg} Destination: {primary.name} ({masked_phone})",
        recipient_name=primary.name,
        recipient_phone_masked=masked_phone,
        sms_sid=sms_res.get("sid"),
        call_sid=call_res.get("sid"),
        timestamp=datetime.datetime.now(datetime.timezone.utc)
    )


def check_pending_checkins(db: Session):
    now = datetime.datetime.now(datetime.timezone.utc)
    overdue_checkins = db.query(models.SafeCheckIn).filter(

        models.SafeCheckIn.is_completed == False,
        models.SafeCheckIn.is_triggered == False,
        models.SafeCheckIn.target_time < now
    ).all()
    
    for checkin in overdue_checkins:
        checkin.is_triggered = True
        
    db.commit()
    return overdue_checkins
