from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.alerts import router as alerts_router
from app.api.dashboard import router as dashboard_router
from app.api.demo import router as demo_router
from app.api.environment import router as environment_router
from app.api.incidents import router as incidents_router
from app.api.prediction import router as prediction_router
from app.api.reports import router as reports_router
from app.api.resources import router as resources_router
from app.config import settings
from app.database import init_db
from app.middlewares import register_exception_handlers

app = FastAPI(
    title=settings.app_name,
    description="AI-Based multimodal disaster management and emergency response prototype",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

app.include_router(dashboard_router)
app.include_router(prediction_router)
app.include_router(reports_router)
app.include_router(incidents_router)
app.include_router(resources_router)
app.include_router(alerts_router)
app.include_router(demo_router)
app.include_router(environment_router)


@app.on_event("startup")
def startup_event() -> None:
    init_db()


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "app_name": settings.app_name,
        "environment": settings.app_env,
        "database": "sqlite initialized",
        "model_status": "ready" if settings.model_dir else "unconfigured",
        "demo_mode": settings.enable_demo_scenarios,
    }
