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
    Resolves the primary active (is_enabled == True) emergency contact from the database.
    Does NOT create fake default or unconfirmed emergency contacts.

    Deterministic ordering: the contact explicitly flagged is_primary=True is
    always preferred; if none is flagged (should not normally happen once the
    startup migration runs), the lowest-id enabled contact is used as a
    stable, reproducible fallback -- never "whichever row the database
    happens to return first".
    """
    contacts = db.query(models.EmergencyContact).filter(
        models.EmergencyContact.user_id == user_id,
        models.EmergencyContact.is_enabled == True
    ).order_by(models.EmergencyContact.is_primary.desc(), models.EmergencyContact.id.asc()).all()

    if contacts:
        return contacts[0]

    return None


def trigger_sos(db: Session, request: schemas.SOSRequest, user_id: str = "default_user") -> schemas.SOSResponse:
    """
    Activates immediate SOS Broadcast alerts, triggers Exotel SMS and Voice Call to stored
    active trusted contact(s), logs the event, and identifies nearby safe havens.
    """
    contacts = db.query(models.EmergencyContact).filter(
        models.EmergencyContact.user_id == user_id,
        models.EmergencyContact.is_enabled == True
    ).order_by(models.EmergencyContact.is_primary.desc(), models.EmergencyContact.id.asc()).all()
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
                is_success = True
                response_msg = f"SOS broadcast completed successfully. Emergency SMS sent and voice call initiated to {target_name} ({target_masked})."
            elif sms_status == "sent":
                overall_status = "partially_completed"
                is_success = True
                response_msg = f"SOS alert SMS delivered to {target_name} ({target_masked}). Voice call could not be completed."
            elif call_status == "initiated":
                overall_status = "partially_completed"
                is_success = True
                response_msg = f"SOS voice call initiated to {target_name} ({target_masked}). SMS alert could not be delivered."
            elif sms_status == "dry_run" or call_status == "dry_run":
                overall_status = "dry_run"
                is_success = False
                response_msg = (
                    f"DRY RUN: Exotel dispatch to {target_name} ({target_masked}) was validated but NOT actually sent "
                    "because EXOTEL_DRY_RUN is enabled on the server. No real SMS or call was made."
                )
            else:
                overall_status = "failed"
                is_success = False
                sms_err = sms_res.get("safe_message") or sms_res.get("error") or "SMS dispatch failed"
                call_err = call_res.get("safe_message") or call_res.get("error") or "Voice call initiation failed"
                response_msg = f"Emergency communication failed. Dispatch to trusted contact failed via Exotel (SMS: {sms_err} | Call: {call_err}). Please dial 112 directly."
        else:
            overall_status = "throttled"
            sms_status = "throttled"
            call_status = "throttled"
            is_success = False
            response_msg = reason or "SOS broadcast throttled. Please wait before retrying."

        # Log SOS event
        log_emergency_event(
            db=db,
            user_id=user_id,
            event_type="sos_broadcast",
            recipient_name=target_name,
            recipient_phone_masked=target_masked,
            status=overall_status,
            sid=call_sid or sms_sid,
            error_message=response_msg if not is_success else None,
            latitude=lat,
            longitude=lon
        )
    else:
        overall_status = "no_trusted_contact"
        is_success = False
        response_msg = "No trusted emergency contact is registered. Please configure a trusted contact in Settings or dial 112 directly."
        broadcast_list = ["No registered contact - Dial 112 National Emergency directly"]
        log_emergency_event(
            db=db,
            user_id=user_id,
            event_type="sos_broadcast",
            recipient_name="Emergency Dispatch (112)",
            recipient_phone_masked="112",
            status="no_trusted_contact",
            error_message="No registered contacts found for user",
            latitude=lat,
            longitude=lon
        )

    # Fail-safe emergency response network: Official verified emergency lifelines.
    # Never fabricate fictitious hospitals or police stations with artificial coordinate offsets.
    verified_havens = [
        schemas.SafeHaven(
            name="National Emergency Response Center (Police, Medical, Fire, Disaster)",
            type="National Emergency Service",
            phone="112",
            is_verified=True,
            is_demo=False,
            data_source="Emergency Response Support System (ERSS 112)",
            note="Unified 24/7 national emergency response line. Primary fail-safe lifeline."
        ),
        schemas.SafeHaven(
            name="National Ambulance & Medical Trauma Dispatch",
            type="Medical Emergency / Hospital",
            phone="108",
            is_verified=True,
            is_demo=False,
            data_source="National Health Mission (108 Ambulance)",
            note="24/7 emergency medical dispatch and hospital triage network."
        ),
        schemas.SafeHaven(
            name="Police Emergency Control Room",
            type="Police Department",
            phone="100",
            is_verified=True,
            is_demo=False,
            data_source="National Police Service (100 PCR)",
            note="Direct police emergency dispatch for immediate safety protection."
        )
    ]

    active_transaction_id = call_sid or sms_sid

    return schemas.SOSResponse(
        success=is_success,
        message=response_msg,
        broadcasted_contacts=broadcast_list,
        latitude=lat,
        longitude=lon,
        nearest_havens=verified_havens,
        sms_status=sms_status,
        call_status=call_status,
        overall_status=overall_status,
        recipient_name=target_name,
        recipient_phone_masked=target_masked,
        transaction_id=active_transaction_id
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
        location_name=request.location_name,
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
            timestamp=datetime.datetime.now(datetime.timezone.utc)
        )

    sms_res = {"status": "skipped", "sid": None, "success": True}
    if request.include_sms is not False:
        sms_res = exotel_service.send_emergency_sms(
            to_phone=primary.phone,
            user_name=primary.name,
            latitude=request.latitude,
            longitude=request.longitude,
            location_name=request.location_name,
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

    if sms_status == "sent" and call_status == "initiated":
        overall = "completed"
        is_success = True
        msg = f"Emergency SMS and voice call dispatched successfully to {primary.name} ({masked_phone})."
    elif sms_status == "sent" and call_status == "skipped":
        overall = "completed"
        is_success = True
        msg = f"Emergency SMS dispatched successfully to {primary.name} ({masked_phone})."
    elif call_status == "initiated" and sms_status == "skipped":
        overall = "completed"
        is_success = True
        msg = f"Emergency voice call initiated successfully to {primary.name} ({masked_phone})."
    elif sms_status == "sent" or call_status == "initiated":
        overall = "partially_completed"
        is_success = True
        msg = f"Emergency alert partially dispatched to {primary.name} ({masked_phone}). One channel failed."
    elif sms_status == "dry_run" or call_status == "dry_run":
        overall = "dry_run"
        is_success = False
        msg = (
            f"DRY RUN: Exotel dispatch to {primary.name} ({masked_phone}) was validated but NOT actually sent "
            "because EXOTEL_DRY_RUN is enabled on the server. No real SMS or call was made."
        )
    else:
        overall = "failed"
        is_success = False
        sms_err = sms_res.get("safe_message") or sms_res.get("error") or "SMS failed"
        call_err = call_res.get("safe_message") or call_res.get("error") or "Call failed"
        msg = f"Emergency communication failed. Dispatch to trusted contact failed via Exotel (SMS: {sms_err} | Call: {call_err}). Please dial 112 directly."

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
        success=is_success,
        overall_status=overall,
        sms_status=sms_status,
        call_status=call_status,
        message=msg,
        safe_message=msg,
        recipient_name=primary.name,
        recipient_phone_masked=masked_phone,
        sms_sid=sms_res.get("sid"),
        call_sid=call_res.get("sid"),
        timestamp=datetime.datetime.now(datetime.timezone.utc)
    )


_active_escalating_ids = set()


def to_utc_naive(dt: datetime.datetime) -> datetime.datetime:
    """Normalize datetime to UTC naive for consistent database comparisons."""
    if dt.tzinfo is not None:
        return dt.astimezone(datetime.timezone.utc).replace(tzinfo=None)
    return dt


def escalate_checkin(db: Session, checkin: models.SafeCheckIn) -> models.SafeCheckIn:
    """
    Executes the Dead-Man's Switch emergency escalation workflow for an expired check-in.
    Idempotent: guarantees the same expired check-in cannot trigger repeated emergency calls/SMS.
    """
    # 1. Verify user has not confirmed safety
    if checkin.is_completed:
        if checkin.escalation_status == "pending":
            checkin.escalation_status = "confirmed_safe"
            db.commit()
        return checkin

    # 2. Prevent duplicate dispatch & enforce idempotency
    if checkin.is_triggered and checkin.escalation_status not in ("pending", "escalating"):
        # Already evaluated and dispatched/handled previously
        return checkin

    if checkin.id in _active_escalating_ids:
        # Currently being evaluated in another concurrent process/thread
        return checkin

    # Acquire in-flight escalation lock atomically
    _active_escalating_ids.add(checkin.id)
    now_utc = datetime.datetime.now(datetime.timezone.utc)
    target_ts = int(checkin.target_time.timestamp()) if hasattr(checkin.target_time, "timestamp") else int(datetime.datetime.now().timestamp())
    checkin.idempotency_key = f"chk_{checkin.id}_{target_ts}"
    checkin.is_triggered = True
    checkin.escalation_status = "escalating"
    db.commit()
    db.refresh(checkin)

    try:
        # Re-verify user did not confirm safety during lock acquisition
        if checkin.is_completed:
            checkin.escalation_status = "confirmed_safe"
            db.commit()
            return checkin

        # 3. Get active trusted contact
        active_contact = db.query(models.EmergencyContact).filter(
            models.EmergencyContact.user_id == checkin.user_id,
            models.EmergencyContact.is_enabled == True
        ).first()

        # 4. Get latest known GPS snapshot
        lat = checkin.last_known_latitude
        lon = checkin.last_known_longitude
        if lat is None or lon is None:
            # Fallback: check most recent emergency event or ping with coordinates for this user
            last_event = db.query(models.EmergencyEventLog).filter(
                models.EmergencyEventLog.user_id == checkin.user_id,
                models.EmergencyEventLog.latitude.isnot(None),
                models.EmergencyEventLog.longitude.isnot(None)
            ).order_by(models.EmergencyEventLog.created_at.desc()).first()
            if last_event:
                lat = last_event.latitude
                lon = last_event.longitude

        if not active_contact:
            # No active trusted contact configured
            checkin.escalation_status = "no_trusted_contact"
            checkin.dispatched_at = now_utc
            checkin.dispatch_error = "No active trusted contact configured for user"
            db.commit()
            db.refresh(checkin)

            log_emergency_event(
                db=db,
                user_id=checkin.user_id,
                event_type="dead_man_switch_escalation",
                recipient_name=None,
                recipient_phone_masked=None,
                status="failed",
                error_message="No active trusted contact configured",
                latitude=lat,
                longitude=lon
            )
            return checkin

        # 5. Trigger Exotel emergency communication
        masked_phone = exotel_service.mask_phone_number(active_contact.phone)
        maps_link = f"https://www.google.com/maps?q={lat:.6f},{lon:.6f}" if (lat is not None and lon is not None) else None
        loc_text = f" Last known location: {maps_link}." if maps_link else ""
        user_note = f" Check-in note: '{checkin.checkin_text.strip()}'." if checkin.checkin_text else ""

        escalation_message = (
            f"DEAD-MAN'S SWITCH EMERGENCY ALERT: Traveler '{checkin.user_id}' missed their scheduled safety check-in."
            f"{user_note}{loc_text} Please attempt to reach them immediately or contact emergency services (112)."
        )

        sms_res = exotel_service.send_emergency_sms(
            to_phone=active_contact.phone,
            user_name=active_contact.name,
            latitude=lat,
            longitude=lon,
            custom_message=escalation_message
        )

        call_res = exotel_service.make_emergency_call(
            to_phone=active_contact.phone,
            user_name=active_contact.name
        )

        sms_status = sms_res.get("status", "failed")
        call_status = call_res.get("status", "failed")
        sms_sid = sms_res.get("sid")
        call_sid = call_res.get("sid")

        sms_ok = sms_status == "sent"
        call_ok = call_status == "initiated"

        # 6. Record dispatch result & Update escalation status
        if sms_ok or call_ok:
            checkin.escalation_status = "escalated"
            overall_status = "completed" if (sms_ok and call_ok) else "partially_completed"
            err_msg = None
        elif sms_status == "dry_run" or call_status == "dry_run":
            checkin.escalation_status = "dry_run"
            overall_status = "dry_run"
            err_msg = "DRY RUN: escalation request validated but not sent (EXOTEL_DRY_RUN=true)."
        else:
            checkin.escalation_status = "exotel_failure"
            overall_status = "failed"
            sms_err = sms_res.get("safe_message") or sms_res.get("error") or "SMS failed"
            call_err = call_res.get("safe_message") or call_res.get("error") or "Call failed"
            err_msg = f"SMS: {sms_err} | Call: {call_err}"

        checkin.dispatched_at = now_utc
        checkin.dispatch_sms_sid = sms_sid
        checkin.dispatch_call_sid = call_sid
        checkin.dispatch_recipient_name = active_contact.name
        checkin.dispatch_recipient_phone = masked_phone
        checkin.dispatch_error = err_msg

        db.commit()
        db.refresh(checkin)

        # Audit log in EmergencyEventLog
        log_emergency_event(
            db=db,
            user_id=checkin.user_id,
            event_type="dead_man_switch_escalation",
            recipient_name=active_contact.name,
            recipient_phone_masked=masked_phone,
            status=overall_status,
            sid=call_sid or sms_sid,
            error_message=err_msg,
            latitude=lat,
            longitude=lon
        )
        return checkin

    except Exception as exc:
        db.rollback()
        logger.error(f"Unexpected error during checkin escalation: {exc}", exc_info=True)
        checkin.escalation_status = "exotel_failure"
        checkin.dispatch_error = str(exc)
        checkin.dispatched_at = datetime.datetime.now(datetime.timezone.utc)
        try:
            db.commit()
        except Exception:
            db.rollback()
        return checkin
    finally:
        _active_escalating_ids.discard(checkin.id)


def check_pending_checkins(db: Session) -> List[models.SafeCheckIn]:
    """
    Scans for overdue, uncompleted, non-triggered check-ins and executes real emergency escalation.
    """
    now_utc = datetime.datetime.now(datetime.timezone.utc)
    now_naive = now_utc.replace(tzinfo=None)

    pending_items = db.query(models.SafeCheckIn).filter(
        models.SafeCheckIn.is_completed == False,
        models.SafeCheckIn.is_triggered == False
    ).all()

    overdue_to_escalate = []
    for item in pending_items:
        t_time = item.target_time
        if t_time is not None:
            if t_time.tzinfo is not None:
                is_past = t_time <= now_utc
            else:
                is_past = t_time <= now_naive
            if is_past:
                overdue_to_escalate.append(item)

    escalated_results = []
    for checkin in overdue_to_escalate:
        res = escalate_checkin(db, checkin)
        escalated_results.append(res)

    return escalated_results


def set_safe_checkin(
    db: Session,
    checkin_in: schemas.SafeCheckInCreate,
    user_id: str = "default_user"
) -> models.SafeCheckIn:
    """
    Initializes a new safe check-in timer with optional GPS snapshot.
    Cleans up older non-completed timers for the user.
    """
    now_utc = datetime.datetime.now(datetime.timezone.utc)
    db.query(models.SafeCheckIn).filter(
        models.SafeCheckIn.user_id == user_id,
        models.SafeCheckIn.is_completed == False
    ).delete()

    target_time_utc = to_utc_naive(checkin_in.target_time)

    db_checkin = models.SafeCheckIn(
        target_time=target_time_utc,
        checkin_text=checkin_in.checkin_text,
        user_id=user_id,
        is_completed=False,
        is_triggered=False,
        escalation_status="pending",
        last_known_latitude=checkin_in.latitude,
        last_known_longitude=checkin_in.longitude,
        last_location_time=now_utc if (checkin_in.latitude is not None and checkin_in.longitude is not None) else None,
        created_at=now_utc
    )
    db.add(db_checkin)
    db.commit()
    db.refresh(db_checkin)
    return db_checkin


def confirm_safe_checkin(
    db: Session,
    user_id: str = "default_user"
) -> models.SafeCheckIn:
    """
    Completes the active check-in timer safely, preventing any escalation.
    """
    active_checkin = db.query(models.SafeCheckIn).filter(
        models.SafeCheckIn.user_id == user_id,
        models.SafeCheckIn.is_completed == False
    ).order_by(models.SafeCheckIn.target_time.desc()).first()

    if not active_checkin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active check-in timers found."
        )

    active_checkin.is_completed = True
    active_checkin.escalation_status = "confirmed_safe"
    db.commit()
    db.refresh(active_checkin)
    return active_checkin


def cancel_safe_checkin(
    db: Session,
    user_id: str = "default_user"
) -> models.SafeCheckIn:
    """
    Cancels an active check-in timer without triggering escalation.
    """
    active_checkin = db.query(models.SafeCheckIn).filter(
        models.SafeCheckIn.user_id == user_id,
        models.SafeCheckIn.is_completed == False
    ).order_by(models.SafeCheckIn.target_time.desc()).first()

    if not active_checkin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active check-in timers found to cancel."
        )

    active_checkin.is_completed = True
    active_checkin.escalation_status = "cancelled"
    db.commit()
    db.refresh(active_checkin)
    return active_checkin


def update_checkin_location(
    db: Session,
    latitude: float,
    longitude: float,
    user_id: str = "default_user"
) -> models.SafeCheckIn:
    """
    Updates the latest known GPS snapshot for the active check-in timer.
    """
    active_checkin = db.query(models.SafeCheckIn).filter(
        models.SafeCheckIn.user_id == user_id,
        models.SafeCheckIn.is_completed == False
    ).order_by(models.SafeCheckIn.target_time.desc()).first()

    if not active_checkin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active check-in timer found to update location."
        )

    active_checkin.last_known_latitude = latitude
    active_checkin.last_known_longitude = longitude
    active_checkin.last_location_time = datetime.datetime.now(datetime.timezone.utc)
    db.commit()
    db.refresh(active_checkin)
    return active_checkin

