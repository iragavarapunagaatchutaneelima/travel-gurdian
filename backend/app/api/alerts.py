from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models import models
from app.schemas import schemas
from app.services import sense

router = APIRouter()

@router.get("/", response_model=List[schemas.AlertResponse])
def read_alerts(
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    radius: Optional[float] = 50.0,
    db: Session = Depends(get_db)
):
    """
    Get active alerts. Optionally filter by geographic coordinates and radius.
    """
    if lat is not None and lon is not None:
        return sense.get_alerts_near_coords(db, lat, lon, radius)
    return sense.get_active_alerts(db)

@router.post("/", response_model=schemas.AlertResponse, status_code=status.HTTP_201_CREATED)
def create_alert(alert: schemas.AlertCreate, db: Session = Depends(get_db)):
    """
    Publish a new real-time threat alert.
    """
    db_alert = models.Alert(
        title=alert.title,
        description=alert.description,
        category=alert.category,
        severity=alert.severity,
        latitude=alert.latitude,
        longitude=alert.longitude,
        radius_km=alert.radius_km,
        active=alert.active
    )
    db.add(db_alert)
    db.commit()
    db.refresh(db_alert)
    return db_alert
