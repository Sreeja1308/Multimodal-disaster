from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.database import SessionLocal
from app.models import Incident
from app.schemas import IncidentCreateRequest, IncidentResponse

router = APIRouter(prefix="/incidents", tags=["incidents"])


@router.get("", response_model=list[IncidentResponse])
def get_incidents():
    db = SessionLocal()
    try:
        return db.query(Incident).all()
    finally:
        db.close()


@router.post("", response_model=IncidentResponse)
def create_incident(payload: IncidentCreateRequest):
    db = SessionLocal()
    try:
        incident = Incident(
            name=payload.name,
            location=payload.location,
            latitude=payload.latitude,
            longitude=payload.longitude,
            severity=payload.severity,
            status=payload.status,
            priority_score=payload.priority_score,
            notes=payload.notes,
            source=payload.source,
        )
        db.add(incident)
        db.commit()
        db.refresh(incident)
        return incident
    finally:
        db.close()


@router.get("/{incident_id}", response_model=IncidentResponse)
def get_incident(incident_id: int):
    db = SessionLocal()
    try:
        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        if incident is None:
            raise HTTPException(status_code=404, detail="Incident not found")
        return incident
    finally:
        db.close()
