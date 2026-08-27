import json
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models import models
from app.schemas import schemas

def calculate_risk(db: Session, request: schemas.RiskRequest) -> schemas.RiskReportResponse:
    # 1. Fetch destination base parameters from DB, fall back to default if not found
    destination = db.query(models.Destination).filter(
        models.Destination.name.ilike(request.destination_name)
    ).first()
    
    base_score = 80
    dest_lat = 0.0
    dest_lon = 0.0
    
    if destination:
        base_score = destination.base_safety_score
        dest_lat = destination.latitude
        dest_lon = destination.longitude
    else:
        # Generate coordinates based on name hash for consistent mock visualizer
        hash_val = sum(ord(c) for c in request.destination_name)
        dest_lat = 30.0 + (hash_val % 20)
        dest_lon = -80.0 + (hash_val % 40)
        
    # 2. Check for active alerts impacting the area (in a real app, do spatial queries)
    # We will fetch active alerts that match this destination (or mock it using destination latitude/longitude bounds)
    active_alerts = db.query(models.Alert).filter(models.Alert.active == True).all()
    
    # Calculate penalty based on active alerts in the region
    alert_penalty = 0
    severe_alerts = []
    
    for alert in active_alerts:
        # Basic distance or category-based mock checking
        # If coordinates are close (e.g., delta < 2.0 degrees), apply penalty
        lat_diff = abs(alert.latitude - dest_lat)
        lon_diff = abs(alert.longitude - dest_lon)
        if lat_diff < 3.0 and lon_diff < 3.0:
            if alert.severity == "critical":
                alert_penalty += 20
                severe_alerts.append(f"CRITICAL: {alert.title}")
            elif alert.severity == "danger":
                alert_penalty += 12
                severe_alerts.append(f"DANGER: {alert.title}")
            elif alert.severity == "warning":
                alert_penalty += 5
                severe_alerts.append(f"WARNING: {alert.title}")
                
    # 3. Apply profile-specific multipliers/penalties
    profile_penalty = 0
    profile_recs = []
    
    profile = request.traveler_profile.lower()
    if "solo" in profile:
        profile_penalty += 5
        if "female" in profile:
            profile_penalty += 5
            profile_recs.append("Ensure sharing active location updates using the ASSIST portal with trusted emergency contacts.")
            profile_recs.append("Select accommodations that feature 24/7 front desk security.")
        else:
            profile_recs.append("Keep a low profile and avoid walking in poorly lit suburban streets alone after dusk.")
    elif "family" in profile or "kid" in profile:
        profile_recs.append("Prioritize transit options with safety belts and child-safety seat compatibility.")
        profile_recs.append("Keep printed cards of accommodation addresses in children's pockets.")
    elif "senior" in profile or "elderly" in profile:
        profile_penalty += 4
        profile_recs.append("Identify nearest english-speaking emergency hospital structures prior to traveling.")
        profile_recs.append("Consider purchasing high-grade travel health insurance covering repatriation.")
    elif "adventure" in profile:
        profile_recs.append("Register with local parks and rescue services before undertaking remote hiking routes.")
        profile_recs.append("Ensure you carry satellite messaging devices if traveling outside standard cellular range.")

    # 4. Apply transport-specific modifiers
    transport = request.transport_mode.lower()
    transport_recs = []
    if "public" in transport:
        profile_recs.append("Be vigilant of pickpockets on crowded public transit lines and subway systems.")
    elif "walking" in transport:
        profile_recs.append("Be cautious when crossing streets; local pedestrian safety standards may vary significantly.")
    elif "rental" in transport:
        profile_recs.append("Familiarize yourself with local toll roads, traffic signs, and drive-on-left/right requirements.")
    elif "ride" in transport:
        profile_recs.append("Verify driver identity and license plate in-app before entering any rideshare vehicle.")

    # 5. Formulate score breakdowns
    crime_score = max(30, min(100, base_score - (alert_penalty // 2) - (10 if "solo" in profile else 0)))
    health_score = max(30, min(100, base_score - (15 if len(request.health_considerations or []) > 0 else 0)))
    transit_score = max(30, min(100, base_score - (8 if "public" in transport else 3)))
    hazard_score = max(30, min(100, base_score - alert_penalty))

    overall_score = int((crime_score * 0.35) + (health_score * 0.20) + (transit_score * 0.15) + (hazard_score * 0.30))
    overall_score = max(10, min(100, overall_score))

    # 6. Standard recommendations
    general_recs = [
        "Store digital copies of all essential documents (passports, visas, insurance) securely in the cloud.",
        "Enroll in your government's smart traveler enrollment program (e.g., US STEP) for embassy support."
    ]

    # Combine recommendations
    all_recs = general_recs + profile_recs + transport_recs
    if severe_alerts:
        all_recs.insert(0, f"Monitor local updates carefully regarding: {', '.join(severe_alerts[:2])}")

    # Build response
    report = schemas.RiskReportResponse(
        destination_name=request.destination_name,
        traveler_profile=request.traveler_profile,
        overall_score=overall_score,
        score_breakdown={
            "crime": crime_score,
            "health": health_score,
            "transit": transit_score,
            "hazard": hazard_score
        },
        recommendations=all_recs,
        created_at=schemas.datetime.utcnow()
    )
    
    # Save to history db
    db_report = models.RiskReport(
        destination_name=report.destination_name,
        traveler_profile=report.traveler_profile,
        overall_score=report.overall_score,
        score_breakdown_json=json.dumps(report.score_breakdown),
        recommendations_json=json.dumps(report.recommendations),
        created_at=report.created_at
    )
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    
    report.id = db_report.id
    return report
