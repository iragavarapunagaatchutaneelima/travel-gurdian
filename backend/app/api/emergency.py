from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.schemas import schemas
from app.services import assist, exotel_service

router = APIRouter()


@router.post("/sms", response_model=schemas.EmergencySMSResponse)
@router.post("/emergency/sms", response_model=schemas.EmergencySMSResponse, include_in_schema=False)
def send_emergency_sms(
    request: schemas.EmergencyActionRequest,
    user_id: str = "default_user",
    db: Session = Depends(get_db)
):
    """
    Sends an Exotel emergency SMS strictly to the user's registered Trusted Contact.
    Validates E.164 phone numbers, queries Exotel Singapore cluster, records audit log,
    and returns verified status with SMS SID.
    """
    return assist.send_trusted_contact_sms(db, request, user_id=user_id)


@router.post("/call", response_model=schemas.EmergencyCallResponse)
@router.post("/emergency/call", response_model=schemas.EmergencyCallResponse, include_in_schema=False)
def make_emergency_call(
    request: schemas.EmergencyActionRequest,
    user_id: str = "default_user",
    db: Session = Depends(get_db)
):
    """
    Initiates an Exotel outbound emergency voice call strictly to the user's registered Trusted Contact.
    Queries Exotel Singapore cluster (Calls/connect.json), records audit log, and returns Call SID.
    """
    return assist.make_trusted_contact_call(db, request, user_id=user_id)


@router.post("/notify-trusted-contact", response_model=schemas.EmergencyNotificationResponse)
@router.post("/emergency/notify-trusted-contact", response_model=schemas.EmergencyNotificationResponse, include_in_schema=False)
def notify_trusted_contact(
    request: schemas.EmergencyActionRequest,
    user_id: str = "default_user",
    db: Session = Depends(get_db)
):
    """
    Combined emergency endpoint: simultaneously triggers SMS alert and outbound voice call
    to the traveler's registered Trusted Contact. Never returns success unless Exotel actually accepts.
    """
    return assist.notify_trusted_contact(db, request, user_id=user_id)


@router.get("/config-status", response_model=schemas.ExotelConfigStatusResponse)
@router.get("/emergency/config-status", response_model=schemas.ExotelConfigStatusResponse, include_in_schema=False)
def get_config_status():
    """
    Readiness inspection: returns configuration status for Exotel Singapore cluster without exposing secrets.
    """
    from app.core.config import settings
    is_valid, cfg_err = exotel_service.validate_exotel_configuration()
    return schemas.ExotelConfigStatusResponse(
        is_configured=is_valid,
        region="Singapore",
        host=exotel_service._get_exotel_host(),
        account_sid_configured=bool(settings.EXOTEL_ACCOUNT_SID),
        api_key_configured=bool(settings.EXOTEL_API_KEY and not settings.EXOTEL_API_KEY.startswith("your_")),
        api_token_configured=bool(settings.EXOTEL_API_TOKEN and not settings.EXOTEL_API_TOKEN.startswith("your_")),
        exophone_configured=bool(settings.EXOTEL_EXOPHONE),
        safe_message=cfg_err or "Exotel configuration is active for Singapore region."
    )


@router.get("/diagnostic", response_model=schemas.ExotelDiagnosticResponse)
@router.get("/emergency/diagnostic", response_model=schemas.ExotelDiagnosticResponse, include_in_schema=False)
def get_diagnostic():
    """
    Safe connectivity check: performs live authenticated test against Exotel Singapore cluster Balance API.
    Never exposes API keys or tokens.
    """
    return exotel_service.test_exotel_authentication()


@router.get("/logs", response_model=List[schemas.EmergencyEventLogResponse])
@router.get("/emergency/logs", response_model=List[schemas.EmergencyEventLogResponse], include_in_schema=False)
def get_logs(
    limit: int = 50,
    user_id: str = "default_user",
    db: Session = Depends(get_db)
):
    """
    Retrieves recent emergency event audit logs from the database.
    """
    return assist.get_emergency_event_logs(db, user_id=user_id, limit=limit)


# --- EMERGENCY CONTACTS SYNCHRONIZATION ALIASES ---

@router.get("/contacts", response_model=List[schemas.EmergencyContactResponse])
@router.get("/emergency/contacts", response_model=List[schemas.EmergencyContactResponse], include_in_schema=False)
def get_emergency_contacts_alias(user_id: str = "default_user", db: Session = Depends(get_db)):
    from app.api.assist import get_contacts
    return get_contacts(user_id=user_id, db=db)


@router.post("/contacts", response_model=schemas.EmergencyContactResponse, status_code=status.HTTP_201_CREATED)
@router.post("/emergency/contacts", response_model=schemas.EmergencyContactResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_emergency_contact_alias(contact: schemas.EmergencyContactCreate, user_id: str = "default_user", db: Session = Depends(get_db)):
    from app.api.assist import create_contact
    return create_contact(contact=contact, user_id=user_id, db=db)


@router.put("/contacts/{contact_id}", response_model=schemas.EmergencyContactResponse)
@router.put("/emergency/contacts/{contact_id}", response_model=schemas.EmergencyContactResponse, include_in_schema=False)
@router.patch("/contacts/{contact_id}", response_model=schemas.EmergencyContactResponse)
@router.patch("/emergency/contacts/{contact_id}", response_model=schemas.EmergencyContactResponse, include_in_schema=False)
def update_emergency_contact_alias(contact_id: int, update: schemas.EmergencyContactUpdate, user_id: str = "default_user", db: Session = Depends(get_db)):
    from app.api.assist import update_contact
    return update_contact(contact_id=contact_id, update=update, user_id=user_id, db=db)


@router.delete("/contacts/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
@router.delete("/emergency/contacts/{contact_id}", status_code=status.HTTP_204_NO_CONTENT, include_in_schema=False)
def delete_emergency_contact_alias(contact_id: int, user_id: str = "default_user", db: Session = Depends(get_db)):
    from app.api.assist import delete_contact
    return delete_contact(contact_id=contact_id, user_id=user_id, db=db)


# --- CHECK-IN DEAD-MAN'S SWITCH ALIASES ---

@router.get("/checkin", response_model=List[schemas.SafeCheckInResponse])
@router.get("/emergency/checkin", response_model=List[schemas.SafeCheckInResponse], include_in_schema=False)
def get_checkins_alias(user_id: str = "default_user", db: Session = Depends(get_db)):
    from app.api.assist import get_checkins
    return get_checkins(user_id=user_id, db=db)


@router.get("/checkin/active", response_model=schemas.SafeCheckInResponse)
@router.get("/emergency/checkin/active", response_model=schemas.SafeCheckInResponse, include_in_schema=False)
def get_active_checkin_alias(user_id: str = "default_user", db: Session = Depends(get_db)):
    from app.api.assist import get_active_checkin
    return get_active_checkin(user_id=user_id, db=db)


@router.post("/checkin", response_model=schemas.SafeCheckInResponse, status_code=status.HTTP_201_CREATED)
@router.post("/emergency/checkin", response_model=schemas.SafeCheckInResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def set_checkin_alias(checkin: schemas.SafeCheckInCreate, user_id: str = "default_user", db: Session = Depends(get_db)):
    from app.api.assist import set_checkin
    return set_checkin(checkin=checkin, user_id=user_id, db=db)


@router.post("/checkin/confirm", response_model=schemas.SafeCheckInResponse)
@router.post("/emergency/checkin/confirm", response_model=schemas.SafeCheckInResponse, include_in_schema=False)
def confirm_checkin_alias(user_id: str = "default_user", db: Session = Depends(get_db)):
    from app.api.assist import confirm_checkin
    return confirm_checkin(user_id=user_id, db=db)


@router.post("/checkin/cancel", response_model=schemas.SafeCheckInResponse)
@router.post("/emergency/checkin/cancel", response_model=schemas.SafeCheckInResponse, include_in_schema=False)
def cancel_checkin_alias(user_id: str = "default_user", db: Session = Depends(get_db)):
    from app.api.assist import cancel_checkin
    return cancel_checkin(user_id=user_id, db=db)


@router.post("/checkin/location", response_model=schemas.SafeCheckInResponse)
@router.post("/emergency/checkin/location", response_model=schemas.SafeCheckInResponse, include_in_schema=False)
def update_checkin_location_alias(location: schemas.SafeCheckInLocationUpdate, user_id: str = "default_user", db: Session = Depends(get_db)):
    from app.api.assist import update_checkin_gps
    return update_checkin_gps(location=location, user_id=user_id, db=db)


@router.post("/checkin/check-overdue", response_model=List[schemas.SafeCheckInResponse])
@router.post("/emergency/checkin/check-overdue", response_model=List[schemas.SafeCheckInResponse], include_in_schema=False)
def run_timer_check_alias(db: Session = Depends(get_db)):
    from app.api.assist import run_timer_check
    return run_timer_check(db=db)


@router.get("/checkin/scheduler-status", response_model=schemas.SchedulerStatusResponse)
@router.get("/emergency/checkin/scheduler-status", response_model=schemas.SchedulerStatusResponse, include_in_schema=False)
def get_checkin_scheduler_status_alias():
    from app.api.assist import get_checkin_scheduler_status
    return get_checkin_scheduler_status()
