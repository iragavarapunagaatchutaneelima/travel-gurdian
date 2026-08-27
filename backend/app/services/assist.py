from sqlalchemy.orm import Session
from app.models import models
from app.schemas import schemas
import datetime

def trigger_sos(db: Session, request: schemas.SOSRequest, user_id: str = "default_user") -> schemas.SOSResponse:
    # 1. Fetch user's registered emergency contacts
    contacts = db.query(models.EmergencyContact).filter(models.EmergencyContact.user_id == user_id).all()
    broadcast_list = []
    for c in contacts:
        contact_type = f"{c.name} ({c.relation}) via {c.phone}"
        if c.email:
            contact_type += f" & {c.email}"
        broadcast_list.append(contact_type)
        
    if not broadcast_list:
        # Provide a default system contact if none registered
        broadcast_list = ["System Emergency Dispatch (911/112)", "Global SOS Command Center"]

    # 2. Generate nearby mock safe havens relative to coordinates
    lat = request.latitude
    lon = request.longitude
    
    # Custom mock safe havens based on user coordinates
    safe_havens = [
        schemas.SafeHaven(
            name="Metropolitan Emergency Police Station",
            type="Police Station",
            latitude=lat + 0.004,
            longitude=lon - 0.002,
            distance_km=0.5,
            phone="+1-555-0199"
        ),
        schemas.SafeHaven(
            name="General Memorial Medical Center",
            type="Hospital",
            latitude=lat - 0.009,
            longitude=lon + 0.007,
            distance_km=1.2,
            phone="+1-555-0144"
        ),
        schemas.SafeHaven(
            name="International Diplomatic Embassy District office",
            type="Embassy",
            latitude=lat + 0.018,
            longitude=lon + 0.015,
            distance_km=2.5,
            phone="+1-555-0100"
        )
    ]
    
    msg = request.custom_message or "Immediate emergency assistance required! Sharing live coordinates."
    response_msg = f"SOS Broadcasting activated. Sent alert: '{msg}'"
    
    return schemas.SOSResponse(
        success=True,
        message=response_msg,
        broadcasted_contacts=broadcast_list,
        latitude=lat,
        longitude=lon,
        nearest_havens=safe_havens
    )

def check_pending_checkins(db: Session):
    # This runs periodically or when checked, updates check-ins that are overdue
    now = datetime.datetime.utcnow()
    overdue_checkins = db.query(models.SafeCheckIn).filter(
        models.SafeCheckIn.is_completed == False,
        models.SafeCheckIn.is_triggered == False,
        models.SafeCheckIn.target_time < now
    ).all()
    
    for checkin in overdue_checkins:
        checkin.is_triggered = True
        # In a real app, dispatch background SMS/Emails to emergency contacts here
        
    db.commit()
    return overdue_checkins
