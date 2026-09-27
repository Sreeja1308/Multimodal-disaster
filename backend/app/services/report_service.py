from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.models import Incident


class DisasterReportService:
    def build_report(
        self,
        db: Session,
        *,
        latitude: float | None,
        longitude: float | None,
        environment: dict[str, Any] | None,
        prediction: dict[str, Any] | None,
    ) -> dict[str, Any]:
        incidents = db.query(Incident).order_by(Incident.created_at.desc()).limit(20).all()
        report_time = datetime.now(timezone.utc).isoformat()
        prediction_status = (prediction or {}).get("status", "unavailable")
        risk_level = (prediction or {}).get("label") if prediction_status == "ok" else "unavailable"
        values = (environment or {}).get("values", {})
        unavailable = (environment or {}).get("unavailable", {})

        return {
            "report_type": "FloodWatch disaster assessment",
            "generated_at": report_time,
            "location": {
                "latitude": latitude,
                "longitude": longitude,
                "status": "selected" if latitude is not None and longitude is not None else "unavailable",
            },
            "risk_assessment": {
                "risk_level": risk_level,
                "prediction_status": prediction_status,
                "probability": (prediction or {}).get("probability") if prediction_status == "ok" else None,
                "model_version": (prediction or {}).get("model_version"),
                "limitations": (prediction or {}).get("warnings", []),
            },
            "observed_environment": {
                "provider": (environment or {}).get("provider", "Unavailable"),
                "observed_at": (environment or {}).get("observed_at"),
                "retrieved_at": (environment or {}).get("retrieved_at"),
                "values": values,
                "unavailable": unavailable,
            },
            "forecast": {
                "status": "available through provider response" if environment and environment.get("daily_forecast") else "unavailable",
                "days": (environment or {}).get("daily_forecast", []),
                "note": "This report does not convert a weather forecast into an official warning.",
            },
            "incidents": [
                {
                    "id": incident.id,
                    "name": incident.name,
                    "location": incident.location,
                    "severity": incident.severity,
                    "status": incident.status,
                    "source": incident.source,
                }
                for incident in incidents
            ],
            "recommended_precautions": [
                "Validate conditions against official local authorities before taking action.",
                "Do not treat this prototype assessment as an official flood warning.",
                "Confirm river levels, drainage conditions, and vulnerable-population information with authoritative sources.",
            ],
            "data_sources": {
                "environment": (environment or {}).get("sources", {}),
                "model": (prediction or {}).get("data_sources", []),
                "incidents": "FloodWatch SQLite database",
            },
        }
