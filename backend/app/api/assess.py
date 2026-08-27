from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import json
from app.core.database import get_db
from app.models import models
from app.schemas import schemas
from app.services import assess

router = APIRouter()

@router.post("/", response_model=schemas.RiskReportResponse)
def evaluate_trip_risk(request: schemas.RiskRequest, db: Session = Depends(get_db)):
    """
    Perform deep risk assessment calculation based on destination, traveler profiles and active hazards.
    """
    try:
        report = assess.calculate_risk(db, request)
        return report
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate risk score: {str(e)}"
        )

@router.get("/history", response_model=List[schemas.RiskReportResponse])
def get_assessment_history(db: Session = Depends(get_db)):
    """
    Retrieve historical trip risk assessments.
    """
    reports = db.query(models.RiskReport).order_by(models.RiskReport.created_at.desc()).limit(10).all()
    
    parsed_reports = []
    for r in reports:
        parsed_reports.append(
            schemas.RiskReportResponse(
                id=r.id,
                destination_name=r.destination_name,
                traveler_profile=r.traveler_profile,
                overall_score=r.overall_score,
                score_breakdown=json.loads(r.score_breakdown_json),
                recommendations=json.loads(r.recommendations_json),
                created_at=r.created_at
            )
        )
    return parsed_reports
