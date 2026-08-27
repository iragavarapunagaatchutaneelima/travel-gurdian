from sqlalchemy.orm import Session
from app.models import models
from app.schemas import schemas
import math

def get_active_alerts(db: Session):
    return db.query(models.Alert).filter(models.Alert.active == True).order_by(models.Alert.created_at.desc()).all()

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    # Haversine formula to compute distance in km
    R = 6371.0 # Earth radius
    
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c

def get_alerts_near_coords(db: Session, lat: float, lon: float, radius_km: float = 50.0):
    all_alerts = db.query(models.Alert).filter(models.Alert.active == True).all()
    nearby_alerts = []
    
    for alert in all_alerts:
        distance = calculate_distance(lat, lon, alert.latitude, alert.longitude)
        # Check if alert lies within range (plus alert's own radius)
        if distance <= (radius_km + alert.radius_km):
            nearby_alerts.append(alert)
            
    return nearby_alerts
