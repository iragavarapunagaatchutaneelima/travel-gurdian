import datetime
import logging
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models import models
from app.schemas import schemas
from app.services import comms_service
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


def _resolve_notify_contacts(
    db: Session,
    user_id: str = "default_user"
) -> List[models.EmergencyContact]:
    """
    Resolves every active (is_enabled == True) emergency/guardian contact to
    notify for this device. Does NOT create fake default or unconfirmed
    contacts, and never reads another device's contacts (see
    app/core/identity.py for why device isolation matters here).
    Deterministic ordering: is_primary first, then lowest id.
    """
    return db.query(models.EmergencyContact).filter(
        models.EmergencyContact.user_id == user_id,
        models.EmergencyContact.is_enabled == True
    ).order_by(models.EmergencyContact.is_primary.desc(), models.EmergencyContact.id.asc()).all()


def trigger_sos(db: Session, request: schemas.SOSRequest, user_id: str = "default_user") -> schemas.SOSResponse:
    """
    Activates immediate SOS Broadcast alerts, triggers Twilio SMS and Voice Call to stored
    active trusted contact(s), logs the event, and identifies nearby safe havens.
    """
    contacts = db.query(models.EmergencyContact).filter(
        models.EmergencyContact.user_id == user_id,
        models.EmergencyContact.is_enabled == True
    ).order_by(models.EmergencyContact.is_primary.desc(), models.EmergencyContact.id.asc()).all()
    broadcast_list = []
    for c in contacts:
        contact_type = f"{c.name} ({c.relation}) via {comms_service.mask_phone_number(c.phone)}"
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
        target_masked = comms_service.mask_phone_number(primary_contact.phone)

        # Check debounce lock
        acquired, reason = comms_service.check_and_acquire_emergency_lock(user_id)

        if acquired:
            # Dispatch Twilio SMS
            sms_res = comms_service.send_emergency_sms(
                to_phone=primary_contact.phone,
                user_name=target_name,
                latitude=lat,
                longitude=lon,
                custom_message=request.custom_message
            )
            sms_status = sms_res.get("status", "failed")
            sms_sid = sms_res.get("sid")

            # Initiate Twilio Call
            call_res = comms_service.make_emergency_call(
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
                    f"DRY RUN: Twilio dispatch to {target_name} ({target_masked}) was validated but NOT actually sent "
                    "because TWILIO_DRY_RUN is enabled on the server. No real SMS or call was made."
                )
            else:
                overall_status = "failed"
                is_success = False
                sms_err = sms_res.get("safe_message") or sms_res.get("error") or "SMS dispatch failed"
                call_err = call_res.get("safe_message") or call_res.get("error") or "Voice call initiation failed"
                response_msg = f"Emergency communication failed. Dispatch to trusted contact failed via Twilio (SMS: {sms_err} | Call: {call_err}). Please dial 112 directly."
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
    Sends an emergency SMS to every configured, enabled guardian contact.
    Logs one audit event per contact.
    """
    contacts = _resolve_notify_contacts(db, user_id)
    if not contacts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No trusted emergency contact is configured. Please add a trusted contact in Settings or Emergency portal."
        )

    names = ", ".join(c.name for c in contacts)
    masked_phones = ", ".join(comms_service.mask_phone_number(c.phone) for c in contacts)

    # Check debounce (once per request, not per contact)
    acquired, reason = comms_service.check_and_acquire_emergency_lock(user_id)
    if not acquired:
        return schemas.EmergencySMSResponse(
            success=False,
            status="failed",
            message=reason or "Emergency request throttled.",
            safe_message=reason or "Please wait before resending emergency alert.",
            recipient_name=names,
            recipient_phone_masked=masked_phones,
            error="Debounced"
        )

    results = []
    for contact in contacts:
        res = comms_service.send_emergency_sms(
            to_phone=contact.phone,
            # "Traveler", never the guardian's own name (a prior bug here
            # passed the recipient's own contact.name back into the message
            # body, so a guardian would read e.g. "yaswanth needs help" when
            # the SMS was sent TO yaswanth). There's no traveler-profile name
            # field in this app to use honestly instead.
            user_name="Traveler",
            latitude=request.latitude,
            longitude=request.longitude,
            location_name=request.location_name,
            custom_message=request.custom_message
        )
        masked_phone = comms_service.mask_phone_number(contact.phone)
        log_emergency_event(
            db=db,
            user_id=user_id,
            event_type="sms_alert",
            recipient_name=contact.name,
            recipient_phone_masked=masked_phone,
            status=res.get("status", "failed"),
            sid=res.get("sid"),
            error_message=res.get("error"),
            latitude=request.latitude,
            longitude=request.longitude
        )
        results.append((contact, masked_phone, res))

    any_success = any(r.get("success") for _, _, r in results)
    first_sid = next((r.get("sid") for _, _, r in results if r.get("sid")), None)
    sent_to = [c.name for c, _, r in results if r.get("success")]
    failed_for = [c.name for c, _, r in results if not r.get("success")]

    if any_success and not failed_for:
        overall_status = "sent"
        message = f"Emergency SMS sent to {', '.join(sent_to)}."
    elif any_success:
        overall_status = "sent"
        message = f"Emergency SMS sent to {', '.join(sent_to)}; failed for {', '.join(failed_for)}."
    else:
        overall_status = results[0][2].get("status", "failed")
        message = f"Emergency SMS failed for all guardian contacts ({names})."

    return schemas.EmergencySMSResponse(
        success=any_success,
        status=overall_status,
        message=message,
        safe_message=message,
        recipient_name=names,
        recipient_phone_masked=masked_phones,
        sid=first_sid,
        error=None if any_success else (results[0][2].get("error"))
    )


def make_trusted_contact_call(
    db: Session,
    request: schemas.EmergencyActionRequest,
    user_id: str = "default_user"
) -> schemas.EmergencyCallResponse:
    """
    Initiates an outbound voice call to every configured, enabled guardian
    contact. Logs one audit event per contact.
    """
    contacts = _resolve_notify_contacts(db, user_id)
    if not contacts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No trusted emergency contact is configured. Please add a trusted contact in Settings or Emergency portal."
        )

    names = ", ".join(c.name for c in contacts)
    masked_phones = ", ".join(comms_service.mask_phone_number(c.phone) for c in contacts)

    # Check debounce
    acquired, reason = comms_service.check_and_acquire_emergency_lock(user_id)
    if not acquired:
        return schemas.EmergencyCallResponse(
            success=False,
            status="failed",
            message=reason or "Emergency request throttled.",
            safe_message=reason or "Please wait before initiating another call.",
            recipient_name=names,
            recipient_phone_masked=masked_phones,
            error="Debounced"
        )

    results = []
    for contact in contacts:
        res = comms_service.make_emergency_call(to_phone=contact.phone, user_name="Traveler")
        masked_phone = comms_service.mask_phone_number(contact.phone)
        log_emergency_event(
            db=db,
            user_id=user_id,
            event_type="voice_call",
            recipient_name=contact.name,
            recipient_phone_masked=masked_phone,
            status=res.get("status", "failed"),
            sid=res.get("sid"),
            error_message=res.get("error"),
            latitude=request.latitude,
            longitude=request.longitude
        )
        results.append((contact, res))

    any_success = any(r.get("success") for _, r in results)
    first_sid = next((r.get("sid") for _, r in results if r.get("sid")), None)
    called = [c.name for c, r in results if r.get("success")]
    failed_for = [c.name for c, r in results if not r.get("success")]

    if any_success and not failed_for:
        overall_status = "initiated"
        message = f"Emergency call initiated to {', '.join(called)}."
    elif any_success:
        overall_status = "initiated"
        message = f"Emergency call initiated to {', '.join(called)}; failed for {', '.join(failed_for)}."
    else:
        overall_status = results[0][1].get("status", "failed")
        message = f"Emergency call failed for all guardian contacts ({names})."

    return schemas.EmergencyCallResponse(
        success=any_success,
        status=overall_status,
        message=message,
        safe_message=message,
        recipient_name=names,
        recipient_phone_masked=masked_phones,
        sid=first_sid,
        error=None if any_success else (results[0][1].get("error"))
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
    contacts = _resolve_notify_contacts(db, user_id)
    if not contacts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No trusted emergency contact is configured. Please add a trusted contact in Settings or Emergency portal."
        )

    names = ", ".join(c.name for c in contacts)
    masked_phones = ", ".join(comms_service.mask_phone_number(c.phone) for c in contacts)

    # Check debounce
    acquired, reason = comms_service.check_and_acquire_emergency_lock(user_id)
    if not acquired:
        return schemas.EmergencyNotificationResponse(
            success=False,
            overall_status="failed",
            sms_status="failed",
            call_status="failed",
            message=reason or "Emergency request throttled.",
            safe_message=reason or "Please wait before resending emergency notification.",
            recipient_name=names,
            recipient_phone_masked=masked_phones,
            timestamp=datetime.datetime.now(datetime.timezone.utc)
        )

    sms_results = []
    call_results = []
    for contact in contacts:
        masked_phone = comms_service.mask_phone_number(contact.phone)

        sms_res = {"status": "skipped", "sid": None, "success": True}
        if request.include_sms is not False:
            sms_res = comms_service.send_emergency_sms(
                to_phone=contact.phone,
                user_name="Traveler",
                latitude=request.latitude,
                longitude=request.longitude,
                location_name=request.location_name,
                custom_message=request.custom_message
            )
        call_res = {"status": "skipped", "sid": None, "success": True}
        if request.include_call is not False:
            call_res = comms_service.make_emergency_call(to_phone=contact.phone, user_name="Traveler")

        contact_sms_ok = sms_res.get("status") in ("sent", "skipped")
        contact_call_ok = call_res.get("status") in ("initiated", "skipped")
        if sms_res.get("status") == "sent" or call_res.get("status") == "initiated":
            per_contact_status = "completed" if (contact_sms_ok and contact_call_ok) else "partially_completed"
        elif sms_res.get("status") == "dry_run" or call_res.get("status") == "dry_run":
            per_contact_status = "dry_run"
        else:
            per_contact_status = "failed"

        log_emergency_event(
            db=db,
            user_id=user_id,
            event_type="emergency_broadcast",
            recipient_name=contact.name,
            recipient_phone_masked=masked_phone,
            status=per_contact_status,
            sid=call_res.get("sid") or sms_res.get("sid"),
            error_message=f"SMS: {sms_res.get('error') or 'ok'} | Call: {call_res.get('error') or 'ok'}",
            latitude=request.latitude,
            longitude=request.longitude
        )
        sms_results.append((contact, sms_res))
        call_results.append((contact, call_res))

    all_sms_ok = all(r.get("status") in ("sent", "skipped") for _, r in sms_results)
    all_call_ok = all(r.get("status") in ("initiated", "skipped") for _, r in call_results)
    any_sms_ok = any(r.get("status") == "sent" for _, r in sms_results)
    any_call_ok = any(r.get("status") == "initiated" for _, r in call_results)
    any_dry_run = any(r.get("status") == "dry_run" for _, r in sms_results + call_results)
    sms_status = "sent" if any_sms_ok else (sms_results[0][1].get("status", "failed") if sms_results else "skipped")
    call_status = "initiated" if any_call_ok else (call_results[0][1].get("status", "failed") if call_results else "skipped")

    if any_sms_ok or any_call_ok:
        overall = "completed" if (all_sms_ok and all_call_ok) else "partially_completed"
        is_success = True
        msg = f"Emergency alert dispatched to {names} ({masked_phones})."
    elif any_dry_run:
        overall = "dry_run"
        is_success = False
        msg = (
            f"DRY RUN: Twilio dispatch to {names} ({masked_phones}) was validated but NOT actually sent "
            "because TWILIO_DRY_RUN is enabled on the server. No real SMS or call was made."
        )
    else:
        overall = "failed"
        is_success = False
        msg = f"Emergency communication failed for all guardian contacts ({names}). Please dial 112 directly."

    return schemas.EmergencyNotificationResponse(
        success=is_success,
        overall_status=overall,
        sms_status=sms_status,
        call_status=call_status,
        message=msg,
        safe_message=msg,
        recipient_name=names,
        recipient_phone_masked=masked_phones,
        sms_sid=next((r.get("sid") for _, r in sms_results if r.get("sid")), None),
        call_sid=next((r.get("sid") for _, r in call_results if r.get("sid")), None),
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

        # 3. Get every active guardian contact (falls back to any enabled
        # contact if this specific user_id has none -- see
        # _resolve_notify_contacts for why).
        active_contacts = _resolve_notify_contacts(db, checkin.user_id)

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

        if not active_contacts:
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

        # 5. Trigger Twilio emergency communication to every guardian contact.
        # Short, direct message -- the traveler missed a safety check-in,
        # not a long formatted report.
        names = ", ".join(c.name for c in active_contacts)
        masked_phones = ", ".join(comms_service.mask_phone_number(c.phone) for c in active_contacts)
        note_suffix = f" Note: {checkin.checkin_text.strip()}" if checkin.checkin_text else ""
        escalation_note = f"Missed safety check-in.{note_suffix}"

        results = []
        for contact in active_contacts:
            sms_res = comms_service.send_emergency_sms(
                to_phone=contact.phone,
                user_name="Traveler",
                latitude=lat,
                longitude=lon,
                custom_message=escalation_note
            )
            call_res = comms_service.make_emergency_call(to_phone=contact.phone, user_name="Traveler")
            results.append((contact, sms_res, call_res))

        any_sms_ok = any(s.get("status") == "sent" for _, s, _ in results)
        any_call_ok = any(c.get("status") == "initiated" for _, _, c in results)
        any_dry_run = any(s.get("status") == "dry_run" or c.get("status") == "dry_run" for _, s, c in results)
        first_sms_sid = next((s.get("sid") for _, s, _ in results if s.get("sid")), None)
        first_call_sid = next((c.get("sid") for _, _, c in results if c.get("sid")), None)

        # 6. Record dispatch result & Update escalation status
        if any_sms_ok or any_call_ok:
            checkin.escalation_status = "escalated"
            all_ok = all(s.get("status") == "sent" and c.get("status") == "initiated" for _, s, c in results)
            overall_status = "completed" if all_ok else "partially_completed"
            err_msg = None
        elif any_dry_run:
            checkin.escalation_status = "dry_run"
            overall_status = "dry_run"
            err_msg = "DRY RUN: escalation request validated but not sent (TWILIO_DRY_RUN=true)."
        else:
            checkin.escalation_status = "twilio_failure"
            overall_status = "failed"
            first_sms_err = results[0][1].get("safe_message") or results[0][1].get("error") or "SMS failed"
            first_call_err = results[0][2].get("safe_message") or results[0][2].get("error") or "Call failed"
            err_msg = f"SMS: {first_sms_err} | Call: {first_call_err}"

        checkin.dispatched_at = now_utc
        checkin.dispatch_sms_sid = first_sms_sid
        checkin.dispatch_call_sid = first_call_sid
        checkin.dispatch_recipient_name = names
        checkin.dispatch_recipient_phone = masked_phones
        checkin.dispatch_error = err_msg

        db.commit()
        db.refresh(checkin)

        # Audit log in EmergencyEventLog (one per contact)
        for contact, sms_res, call_res in results:
            log_emergency_event(
                db=db,
                user_id=checkin.user_id,
                event_type="dead_man_switch_escalation",
                recipient_name=contact.name,
                recipient_phone_masked=comms_service.mask_phone_number(contact.phone),
                status=overall_status,
                sid=call_res.get("sid") or sms_res.get("sid"),
                error_message=err_msg,
                latitude=lat,
                longitude=lon
            )
        return checkin

    except Exception as exc:
        db.rollback()
        logger.error(f"Unexpected error during checkin escalation: {exc}", exc_info=True)
        checkin.escalation_status = "twilio_failure"
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

