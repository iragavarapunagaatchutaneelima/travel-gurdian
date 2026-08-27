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
    Activate immediate SOS Broadcast alerts, notify guardians, and identify safe havens.
    """
    return assist.trigger_sos(db, request, user_id)
