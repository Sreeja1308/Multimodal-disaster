from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.database import SessionLocal, init_db
from app.services.report_service import DisasterReportService
from app.services.word_report_service import WordReportService

router = APIRouter(prefix="/reports", tags=["reports"])
service = DisasterReportService()
word_service = WordReportService()


class DisasterReportRequest(BaseModel):
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    environment: dict[str, Any] | None = None
    prediction: dict[str, Any] | None = None


@router.post("/generate")
def generate_report(request: DisasterReportRequest):
    init_db()
    db = SessionLocal()
    try:
        return service.build_report(
            db,
            latitude=request.latitude,
            longitude=request.longitude,
            environment=request.environment,
            prediction=request.prediction,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Report generation failed: {exc}") from exc
    finally:
        db.close()


@router.post("/generate.docx")
def generate_word_report(request: DisasterReportRequest):
    init_db()
    db = SessionLocal()
    try:
        report = service.build_report(
            db,
            latitude=request.latitude,
            longitude=request.longitude,
            environment=request.environment,
            prediction=request.prediction,
        )
        document = word_service.build_docx(report)
        return StreamingResponse(
            document,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": "attachment; filename=FloodWatch-disaster-report.docx"},
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Word report generation failed: {exc}") from exc
    finally:
        db.close()
