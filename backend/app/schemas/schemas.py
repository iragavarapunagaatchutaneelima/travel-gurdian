from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from datetime import datetime

# Destination Schemas
class DestinationBase(BaseModel):
    name: str
    country: str
    latitude: float
    longitude: float
    base_safety_score: int = 80

class DestinationCreate(DestinationBase):
    emergency_contacts_json: Optional[str] = "{}"
    cultural_tips_json: Optional[str] = "[]"
    local_laws_json: Optional[str] = "[]"

class DestinationResponse(DestinationBase):
    id: int
    emergency_contacts_json: Optional[str] = None
    cultural_tips_json: Optional[str] = None
    local_laws_json: Optional[str] = None

    class Config:
        from_attributes = True

# Alert Schemas
class AlertBase(BaseModel):
    title: str
    description: str
    category: str  # weather, crime, health, unrest
    severity: str  # info, warning, danger, critical
    latitude: float
    longitude: float
    radius_km: float = 10.0
    active: bool = True

class AlertCreate(AlertBase):
    pass

class AlertResponse(AlertBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Risk Report / Calculator Schemas
class RiskRequest(BaseModel):
    destination_name: str
    traveler_profile: str  # Solo Female, Solo Male, Family, Adventure, Senior
    transport_mode: str  # Public Transit, Walking, Rental Car, Ride Share
    health_considerations: Optional[List[str]] = []
    demographics: Optional[str] = None

class RiskReportResponse(BaseModel):
    id: Optional[int] = None
    destination_name: str
    traveler_profile: str
    overall_score: int  # 0 to 100 Safety Index
    score_breakdown: Dict[str, int]  # {"crime": 80, "health": 60, "transit": 90, "hazard": 75}
    recommendations: List[str]
    created_at: datetime

    class Config:
        from_attributes = True

# Emergency Contact Schemas
class EmergencyContactBase(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    relation: str

class EmergencyContactCreate(EmergencyContactBase):
    pass

class EmergencyContactResponse(EmergencyContactBase):
    id: int
    user_id: str

    class Config:
        from_attributes = True

# Safe Check-In Schemas
class SafeCheckInBase(BaseModel):
    target_time: datetime
    checkin_text: Optional[str] = None

class SafeCheckInCreate(SafeCheckInBase):
    pass

class SafeCheckInResponse(SafeCheckInBase):
    id: int
    user_id: str
    is_completed: bool
    is_triggered: bool
    created_at: datetime

    class Config:
        from_attributes = True

# SOS Trigger Schemas
class SOSRequest(BaseModel):
    latitude: float
    longitude: float
    custom_message: Optional[str] = None

class SafeHaven(BaseModel):
    name: str
    type: str  # Hospital, Police Station, Embassy
    latitude: float
    longitude: float
    distance_km: float
    phone: str

class SOSResponse(BaseModel):
    success: bool
    message: str
    broadcasted_contacts: List[str]
    latitude: float
    longitude: float
    nearest_havens: List[SafeHaven]
