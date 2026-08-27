import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text
from app.core.database import Base

class Destination(Base):
    __tablename__ = "destinations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), index=True)  # e.g., Tokyo, Rio de Janeiro
    country = Column(String(100), index=True)
    
    # Store coordinates as lat/lon fields
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    
    # JSON strings for emergency contacts and cultural rules
    # E.g., {"police": "110", "fire": "119", "medical": "119", "embassy": "+81-3-3224-5000"}
    emergency_contacts_json = Column(Text, nullable=True)
    
    # E.g., ["Respect bow culture", "Tipping is not customary", "Keep voice low on trains"]
    cultural_tips_json = Column(Text, nullable=True)
    
    # E.g., ["Strict laws on medication import", "No public drinking in certain areas"]
    local_laws_json = Column(Text, nullable=True)
    
    # Base risk settings
    base_safety_score = Column(Integer, default=80)  # 0 to 100 (higher is safer)

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    
    # Alert Category: weather, crime, health, unrest
    category = Column(String(50), nullable=False, index=True)
    
    # Severity: info, warning, danger, critical
    severity = Column(String(50), nullable=False, index=True)
    
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    radius_km = Column(Float, default=10.0)
    
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class RiskReport(Base):
    __tablename__ = "risk_reports"

    id = Column(Integer, primary_key=True, index=True)
    destination_name = Column(String(100), nullable=False)
    traveler_profile = Column(String(50), nullable=False)  # Solo, Family, etc.
    
    overall_score = Column(Integer, nullable=False)  # 0 to 100 (safety rating)
    
    # JSON string containing breakdowns, e.g. {"crime": 90, "health": 80, "transit": 70, "hazard": 85}
    score_breakdown_json = Column(Text, nullable=False)
    
    # JSON list of recommendations, e.g. ["Avoid walking alone at night", "Drink bottled water"]
    recommendations_json = Column(Text, nullable=False)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class EmergencyContact(Base):
    __tablename__ = "emergency_contacts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    phone = Column(String(30), nullable=False)
    email = Column(String(100), nullable=True)
    relation = Column(String(50), nullable=False)  # Partner, Parent, Friend, etc.
    user_id = Column(String(50), default="default_user", index=True)

class SafeCheckIn(Base):
    __tablename__ = "safe_checkins"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(50), default="default_user", index=True)
    target_time = Column(DateTime, nullable=False)
    checkin_text = Column(String(200), nullable=True)
    
    is_completed = Column(Boolean, default=False)
    is_triggered = Column(Boolean, default=False)  # SOS triggered because user failed to check in
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
