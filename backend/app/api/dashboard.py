from __future__ import annotations

from fastapi import APIRouter

from app.database import SessionLocal
from app.config import settings
from app.models import Alert, Incident, Resource

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
def dashboard_summary():
    db = SessionLocal()
    try:
        total_incidents = db.query(Incident).count()
        active_incidents = db.query(Incident).filter(Incident.status != "resolved").count()
        available_resources = db.query(Resource).filter(Resource.status == "available").count()
        risk_distribution = {
            "low": db.query(Incident).filter(Incident.severity == "low").count(),
            "medium": db.query(Incident).filter(Incident.severity == "medium").count(),
            "high": db.query(Incident).filter(Incident.severity == "high").count(),
            "critical": db.query(Incident).filter(Incident.severity == "critical").count(),
        }
        recent_alerts = db.query(Alert).count()
        return {
            "total_incidents": total_incidents,
            "active_incidents": active_incidents,
            "available_resources": available_resources,
            "risk_distribution": risk_distribution,
            "recent_alerts": recent_alerts,
            "model_status": "trained" if (settings.model_dir and __import__("pathlib").Path(settings.model_dir, "flood_model.joblib").exists()) else "not_trained",
        }
    finally:
        db.close()
