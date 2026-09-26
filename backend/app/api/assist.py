from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.identity import get_device_id
from app.models import models
from app.schemas import schemas
from app.services import assist, exotel_service

router = APIRouter()

# --- EMERGENCY CONTACTS CRUD (GET, POST, PUT/PATCH, DELETE) ---

@router.get("/contacts", response_model=List[schemas.EmergencyContactResponse])
def get_contacts(user_id: str = Depends(get_device_id), db: Session = Depends(get_db)):
    """
    Retrieve user emergency contacts from backend database (Source of Truth).
    """
    return db.query(models.EmergencyContact).filter(models.EmergencyContact.user_id == user_id).all()


@router.post("/contacts", response_model=schemas.EmergencyContactResponse, status_code=status.HTTP_201_CREATED)
def create_contact(contact: schemas.EmergencyContactCreate, user_id: str = Depends(get_device_id), db: Session = Depends(get_db)):
    """
    Register a new emergency contact. Validates phone number and rejects duplicates.
    """
    if not contact.name or not contact.name.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Contact name cannot be blank.")

    try:
        normalized_phone = exotel_service.normalize_phone_number(contact.phone)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid phone number: {ve}")

    # Check if duplicate contact already exists with this phone number
    exists = db.query(models.EmergencyContact).filter(
        models.EmergencyContact.user_id == user_id,
        models.EmergencyContact.phone == normalized_phone
    ).first()
    if exists:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A contact with this phone number already exists."
        )

    # The first enabled contact a user ever registers automatically becomes
    # their deterministic primary contact, rather than leaving "which one is
    # primary" to database row order.
    has_existing_contact = db.query(models.EmergencyContact).filter(
        models.EmergencyContact.user_id == user_id
    ).first() is not None

    db_contact = models.EmergencyContact(
        name=contact.name.strip(),
        phone=normalized_phone,
        email=contact.email.strip() if contact.email else None,
        relation=contact.relation.strip() if contact.relation else "Emergency Contact",
        is_enabled=contact.is_enabled if contact.is_enabled is not None else True,
        is_primary=not has_existing_contact,
        user_id=user_id
    )
    db.add(db_contact)
    db.commit()
    db.refresh(db_contact)
    return db_contact


@router.put("/contacts/{contact_id}", response_model=schemas.EmergencyContactResponse)
@router.patch("/contacts/{contact_id}", response_model=schemas.EmergencyContactResponse)
def update_contact(
    contact_id: int,
    update: schemas.EmergencyContactUpdate,
    user_id: str = Depends(get_device_id),
    db: Session = Depends(get_db)
):
    """
    Update an existing emergency contact record.
    Prevents creating duplicate records during edit operations.
    Persists enabled/disabled state.
    """
    db_contact = db.query(models.EmergencyContact).filter(
        models.EmergencyContact.id == contact_id,
        models.EmergencyContact.user_id == user_id
    ).first()
    if not db_contact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")

    if update.phone is not None:
        try:
            normalized_phone = exotel_service.normalize_phone_number(update.phone)
        except ValueError as ve:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid phone number: {ve}")

        # Check if another contact has this phone number
        duplicate = db.query(models.EmergencyContact).filter(
            models.EmergencyContact.user_id == user_id,
            models.EmergencyContact.phone == normalized_phone,
            models.EmergencyContact.id != contact_id
        ).first()
        if duplicate:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Another contact already has this phone number."
            )
        db_contact.phone = normalized_phone

    if update.name is not None:
        if not update.name.strip():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Contact name cannot be blank.")
        db_contact.name = update.name.strip()

    if update.relation is not None:
        db_contact.relation = update.relation.strip()

    if update.email is not None:
        db_contact.email = update.email.strip() if update.email else None

    if update.is_enabled is not None:
        db_contact.is_enabled = update.is_enabled

    if update.is_primary is True:
        # Exactly one primary contact per user: demote every other contact
        # for this user before promoting this one.
        db.query(models.EmergencyContact).filter(
            models.EmergencyContact.user_id == user_id,
            models.EmergencyContact.id != contact_id
        ).update({models.EmergencyContact.is_primary: False})
        db_contact.is_primary = True
    elif update.is_primary is False:
        db_contact.is_primary = False

    db.commit()
    db.refresh(db_contact)

    # If the primary contact was disabled or deleted-in-spirit (disabled),
    # promote the next lowest-id enabled contact so there is always a
    # deterministic primary whenever an enabled contact exists.
    if db_contact.is_primary and not db_contact.is_enabled:
        db_contact.is_primary = False
        next_primary = db.query(models.EmergencyContact).filter(
            models.EmergencyContact.user_id == user_id,
            models.EmergencyContact.is_enabled == True,
            models.EmergencyContact.id != contact_id
        ).order_by(models.EmergencyContact.id.asc()).first()
        if next_primary:
            next_primary.is_primary = True
        db.commit()
        db.refresh(db_contact)

    return db_contact


@router.delete("/contacts/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contact(contact_id: int, user_id: str = Depends(get_device_id), db: Session = Depends(get_db)):
    """
    Deregister and permanently delete an emergency contact.
    """
    db_contact = db.query(models.EmergencyContact).filter(
        models.EmergencyContact.id == contact_id,
        models.EmergencyContact.user_id == user_id
    ).first()
    if not db_contact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")
    was_primary = db_contact.is_primary
    db.delete(db_contact)
    db.commit()

    if was_primary:
        next_primary = db.query(models.EmergencyContact).filter(
            models.EmergencyContact.user_id == user_id,
            models.EmergencyContact.is_enabled == True
        ).order_by(models.EmergencyContact.id.asc()).first()
        if next_primary:
            next_primary.is_primary = True
            db.commit()

    return None


# --- SAFE CHECK-IN MANAGEMENT (DEAD-MAN'S SWITCH) ---

@router.get("/checkin", response_model=List[schemas.SafeCheckInResponse])
def get_checkins(user_id: str = Depends(get_device_id), db: Session = Depends(get_db)):
    """
    List active safe check-in timers for the specified traveler.
    """
    return db.query(models.SafeCheckIn).filter(
        models.SafeCheckIn.user_id == user_id,
        models.SafeCheckIn.is_completed == False
    ).order_by(models.SafeCheckIn.target_time.asc()).all()


@router.get("/checkin/active", response_model=schemas.SafeCheckInResponse)
def get_active_checkin(user_id: str = Depends(get_device_id), db: Session = Depends(get_db)):
    """
    Get the single latest active check-in timer for the traveler.
    """
    active = db.query(models.SafeCheckIn).filter(
        models.SafeCheckIn.user_id == user_id,
        models.SafeCheckIn.is_completed == False
    ).order_by(models.SafeCheckIn.target_time.desc()).first()
    if not active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active check-in timer found.")
    return active


@router.post("/checkin", response_model=schemas.SafeCheckInResponse, status_code=status.HTTP_201_CREATED)
def set_checkin(checkin: schemas.SafeCheckInCreate, user_id: str = Depends(get_device_id), db: Session = Depends(get_db)):
    """
    Start a safe check-in timer with optional GPS snapshot.
    """
    return assist.set_safe_checkin(db=db, checkin_in=checkin, user_id=user_id)


@router.post("/checkin/confirm", response_model=schemas.SafeCheckInResponse)
def confirm_checkin(user_id: str = Depends(get_device_id), db: Session = Depends(get_db)):
    """
    Confirm the traveler is safe, completing the active check-in timer and preventing escalation.
    """
    return assist.confirm_safe_checkin(db=db, user_id=user_id)


@router.post("/checkin/cancel", response_model=schemas.SafeCheckInResponse)
def cancel_checkin(user_id: str = Depends(get_device_id), db: Session = Depends(get_db)):
    """
    Cancel an active check-in timer cleanly.
    """
    return assist.cancel_safe_checkin(db=db, user_id=user_id)


@router.post("/checkin/location", response_model=schemas.SafeCheckInResponse)
def update_checkin_gps(location: schemas.SafeCheckInLocationUpdate, user_id: str = Depends(get_device_id), db: Session = Depends(get_db)):
    """
    Update the latest known GPS snapshot for the active check-in timer.
    """
    return assist.update_checkin_location(db=db, latitude=location.latitude, longitude=location.longitude, user_id=user_id)


@router.post("/checkin/check-overdue", response_model=List[schemas.SafeCheckInResponse])
def run_timer_check(db: Session = Depends(get_db)):
    """
    Execute background evaluation check for overdue check-in timers.
    Idempotently escalates any overdue, unconfirmed check-ins via Exotel.
    """
    triggered_logs = assist.check_pending_checkins(db)
    return triggered_logs


@router.get("/checkin/scheduler-status", response_model=schemas.SchedulerStatusResponse)
def get_checkin_scheduler_status():
    """
    Returns live health, heartbeat, and evaluation metrics for the Dead-Man's Switch scheduler.
    """
    from app.services import checkin_scheduler
    return checkin_scheduler.get_scheduler_status()


# --- SOS ENDPOINT ---

@router.post("/sos", response_model=schemas.SOSResponse)
def trigger_sos_broadcast(request: schemas.SOSRequest, user_id: str = Depends(get_device_id), db: Session = Depends(get_db)):
    """
    Activate immediate SOS Broadcast alerts, notify guardians via Exotel SMS/call, and identify safe havens.
    """
    return assist.trigger_sos(db, request, user_id)


# --- EXOTEL EMERGENCY COMMUNICATION ENDPOINTS ---

@router.post("/emergency/sms", response_model=schemas.EmergencySMSResponse)
@router.post("/sms", response_model=schemas.EmergencySMSResponse)
def send_emergency_sms_to_trusted_contact(
    request: schemas.EmergencyActionRequest,
    user_id: str = Depends(get_device_id),
    db: Session = Depends(get_db)
):
    """
    Sends an Exotel emergency SMS strictly to the user's registered Trusted Contact.
    Destination numbers supplied by frontend are ignored/rejected.
    """
    return assist.send_trusted_contact_sms(db, request, user_id)


@router.post("/emergency/call", response_model=schemas.EmergencyCallResponse)
@router.post("/call", response_model=schemas.EmergencyCallResponse)
def make_emergency_call_to_trusted_contact(
    request: schemas.EmergencyActionRequest,
    user_id: str = Depends(get_device_id),
    db: Session = Depends(get_db)
):
    """
    Initiates an Exotel outbound voice call strictly to the user's registered Trusted Contact.
    Destination numbers supplied by frontend are ignored/rejected.
    """
    return assist.make_trusted_contact_call(db, request, user_id)


@router.post("/emergency/notify-trusted-contact", response_model=schemas.EmergencyNotificationResponse)
@router.post("/notify-trusted-contact", response_model=schemas.EmergencyNotificationResponse)
def notify_trusted_contact(
    request: schemas.EmergencyActionRequest,
    user_id: str = Depends(get_device_id),
    db: Session = Depends(get_db)
):
    """
    Unified endpoint: sends emergency SMS and initiates emergency voice call to registered Trusted Contact.
    """
    return assist.notify_trusted_contact(db, request, user_id)


@router.get("/emergency/config-status", response_model=schemas.ExotelConfigStatusResponse)
@router.get("/config-status", response_model=schemas.ExotelConfigStatusResponse)
def get_exotel_config_status():
    """
    Returns boolean indicating whether Exotel server-side credentials are configured.
    Never exposes keys, tokens, or SIDs.
    """
    from app.services.exotel_service import validate_exotel_configuration, _get_exotel_host
    from app.core.config import settings
    is_valid, cfg_err = validate_exotel_configuration()
    return schemas.ExotelConfigStatusResponse(
        is_configured=is_valid,
        dry_run=settings.EXOTEL_DRY_RUN,
        region="Singapore",
        host=_get_exotel_host(),
        account_sid_configured=bool(settings.EXOTEL_ACCOUNT_SID),
        api_key_configured=bool(settings.EXOTEL_API_KEY and not settings.EXOTEL_API_KEY.startswith("your_")),
        api_token_configured=bool(settings.EXOTEL_API_TOKEN and not settings.EXOTEL_API_TOKEN.startswith("your_")),
        exophone_configured=bool(settings.EXOTEL_EXOPHONE),
        safe_message=cfg_err or "Exotel configuration is active for Singapore region."
    )


@router.get("/emergency/diagnostic", response_model=schemas.ExotelDiagnosticResponse)
@router.get("/diagnostic", response_model=schemas.ExotelDiagnosticResponse)
def get_exotel_diagnostic():
    """
    Safe diagnostic inspection: checks Singapore API host, Account SID,
    and runs a live ping against Exotel's Balance API without initiating any calls or SMS.
    Never exposes keys or tokens.
    """
    from app.services.exotel_service import test_exotel_authentication
    return test_exotel_authentication()


@router.get("/emergency/logs", response_model=List[schemas.EmergencyEventLogResponse])
@router.get("/logs", response_model=List[schemas.EmergencyEventLogResponse])
def get_emergency_logs(
    limit: int = 50,
    user_id: str = Depends(get_device_id),
    db: Session = Depends(get_db)
):
    """
    Retrieves recent audit logs of emergency calls and SMS alerts from the database.
    """
    return assist.get_emergency_event_logs(db, user_id=user_id, limit=limit)


