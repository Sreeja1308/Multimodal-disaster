from __future__ import annotations

from fastapi import APIRouter

from app.database import SessionLocal
from app.models import Alert
from app.schemas import AlertCreateRequest, AlertResponse

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("", response_model=list[AlertResponse])
def list_alerts():
    db = SessionLocal()
    try:
        return db.query(Alert).all()
    finally:
        db.close()


from app.services.alert_translation_service import translate


@router.post("", response_model=AlertResponse)
def create_alert(payload: AlertCreateRequest):
    db = SessionLocal()
    try:
        alert = Alert(
            title=payload.title,
            severity=payload.severity,
            affected_locations=payload.affected_locations,
            message=payload.message,
            language=payload.language,
            simulated=payload.simulated,
            status="draft",
        )
        db.add(alert)
        db.commit()
        db.refresh(alert)
        response = {
            "id": alert.id,
            "title": alert.title,
            "severity": alert.severity,
            "affected_locations": alert.affected_locations,
            "message": alert.message,
            "language": alert.language,
            "status": alert.status,
            "simulated": alert.simulated,
            "translations": {
                "en": translate({"location": alert.affected_locations or "the region", "severity": alert.severity, "message": alert.message}, "en"),
                "te": translate({"location": alert.affected_locations or "ప్రాంతం", "severity": alert.severity, "message": alert.message}, "te"),
            },
        }
        return response
    finally:
        db.close()
