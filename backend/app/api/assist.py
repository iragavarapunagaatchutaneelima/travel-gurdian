from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models import models
from app.schemas import schemas
from app.services import assist

router = APIRouter()

# --- EMERGENCY CONTACTS CRUD ---

@router.get("/contacts", response_model=List[schemas.EmergencyContactResponse])
def get_contacts(user_id: str = "default_user", db: Session = Depends(get_db)):
    """
    Retrieve user emergency contacts.
    """
    return db.query(models.EmergencyContact).filter(models.EmergencyContact.user_id == user_id).all()

@router.post("/contacts", response_model=schemas.EmergencyContactResponse, status_code=status.HTTP_201_CREATED)
def create_contact(contact: schemas.EmergencyContactCreate, user_id: str = "default_user", db: Session = Depends(get_db)):
    """
    Register a new emergency contact.
    """
    # Check if contact already exists
    exists = db.query(models.EmergencyContact).filter(
        models.EmergencyContact.user_id == user_id,
        models.EmergencyContact.phone == contact.phone
    ).first()
    if exists:
        return exists
        
    db_contact = models.EmergencyContact(
        name=contact.name,
        phone=contact.phone,
        email=contact.email,
        relation=contact.relation,
        user_id=user_id
    )
    db.add(db_contact)
    db.commit()
    db.refresh(db_contact)
    return db_contact

@router.delete("/contacts/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contact(contact_id: int, user_id: str = "default_user", db: Session = Depends(get_db)):
    """
    Deregister an emergency contact.
    """
    db_contact = db.query(models.EmergencyContact).filter(
        models.EmergencyContact.id == contact_id,
        models.EmergencyContact.user_id == user_id
    ).first()
    if not db_contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    db.delete(db_contact)
    db.commit()
    return None


# --- SAFE CHECK-IN MANAGEMENT ---

@router.get("/checkin", response_model=List[schemas.SafeCheckInResponse])
def get_checkins(user_id: str = "default_user", db: Session = Depends(get_db)):
    """
    List active safe check-in timers.
    """
    return db.query(models.SafeCheckIn).filter(
        models.SafeCheckIn.user_id == user_id,
        models.SafeCheckIn.is_completed == False
    ).order_by(models.SafeCheckIn.target_time.asc()).all()

@router.post("/checkin", response_model=schemas.SafeCheckInResponse, status_code=status.HTTP_201_CREATED)
def set_checkin(checkin: schemas.SafeCheckInCreate, user_id: str = "default_user", db: Session = Depends(get_db)):
    """
    Start a safe check-in timer.
    """
    # Delete any pending checkins to keep it simple for the MVP
    db.query(models.SafeCheckIn).filter(
        models.SafeCheckIn.user_id == user_id,
        models.SafeCheckIn.is_completed == False
    ).delete()
    
    db_checkin = models.SafeCheckIn(
        target_time=checkin.target_time,
        checkin_text=checkin.checkin_text,
        user_id=user_id,
        is_completed=False,
        is_triggered=False
    )
    db.add(db_checkin)
    db.commit()
    db.refresh(db_checkin)
    return db_checkin

@router.post("/checkin/confirm", response_model=schemas.SafeCheckInResponse)
def confirm_checkin(user_id: str = "default_user", db: Session = Depends(get_db)):
    """
    Confirm the traveler is safe, completing the active check-in timer.
    """
    active_checkin = db.query(models.SafeCheckIn).filter(
        models.SafeCheckIn.user_id == user_id,
        models.SafeCheckIn.is_completed == False
    ).order_by(models.SafeCheckIn.target_time.desc()).first()
    
    if not active_checkin:
        raise HTTPException(status_code=404, detail="No active check-in timers found.")
        
    active_checkin.is_completed = True
    db.commit()
    db.refresh(active_checkin)
    return active_checkin

@router.post("/checkin/check-overdue", response_model=List[schemas.SafeCheckInResponse])
def run_timer_check(db: Session = Depends(get_db)):
    """
    Execute background evaluation check for overdue check-in logs.
    """
    triggered_logs = assist.check_pending_checkins(db)
    return triggered_logs


# --- SOS ENDPOINT ---

@router.post("/sos", response_model=schemas.SOSResponse)
def trigger_sos_broadcast(request: schemas.SOSRequest, user_id: str = "default_user", db: Session = Depends(get_db)):
    """
    Activate immediate SOS Broadcast alerts, notify guardians via Exotel SMS/call, and identify safe havens.
    """
    return assist.trigger_sos(db, request, user_id)


# --- EXOTEL EMERGENCY COMMUNICATION ENDPOINTS ---

@router.post("/emergency/sms", response_model=schemas.EmergencySMSResponse)
@router.post("/sms", response_model=schemas.EmergencySMSResponse)
def send_emergency_sms_to_trusted_contact(
    request: schemas.EmergencyActionRequest,
    user_id: str = "default_user",
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
    user_id: str = "default_user",
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
    user_id: str = "default_user",
    db: Session = Depends(get_db)
):
    """
    Unified endpoint: sends emergency SMS and initiates emergency voice call to registered Trusted Contact.
    """
    return assist.notify_trusted_contact(db, request, user_id)


@router.get("/emergency/config-status")
@router.get("/config-status")
def get_exotel_config_status():
    """
    Returns boolean indicating whether Exotel server-side credentials are configured.
    Never exposes keys, tokens, or SIDs.
    """
    from app.services.exotel_service import validate_exotel_configuration
    is_valid, _ = validate_exotel_configuration()
    return {"is_configured": is_valid}


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
    user_id: str = "default_user",
    db: Session = Depends(get_db)
):
    """
    Retrieves recent audit logs of emergency calls and SMS alerts from the database.
    """
    return assist.get_emergency_event_logs(db, user_id=user_id, limit=limit)


