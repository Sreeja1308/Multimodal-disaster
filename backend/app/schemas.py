from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator


class FloodPredictRequest(BaseModel):
    latitude: float
    longitude: float
    rainfall_mm: float
    temperature_c: float
    humidity_pct: float
    river_discharge: float
    water_level_m: float
    elevation_m: float
    land_cover: str = "Agricultural"
    soil_type: str = "Loam"
    population_density: float = 5000.0
    infrastructure: int = 0
    historical_floods: int = 0

    @field_validator("latitude")
    @classmethod
    def validate_latitude(cls, value: float) -> float:
        if not -90 <= value <= 90:
            raise ValueError("latitude must be between -90 and 90")
        return value

    @field_validator("longitude")
    @classmethod
    def validate_longitude(cls, value: float) -> float:
        if not -180 <= value <= 180:
            raise ValueError("longitude must be between -180 and 180")
        return value

    @field_validator("land_cover")
    @classmethod
    def validate_land_cover(cls, value: str) -> str:
        return value.strip() or "Agricultural"

    @field_validator("soil_type")
    @classmethod
    def validate_soil_type(cls, value: str) -> str:
        return value.strip() or "Loam"


class FloodPredictionResult(BaseModel):
    prediction: int | None
    probability: float | None
    label: str
    model_name: str
    explanation: Dict[str, float]
    status: str = "ok"
    prediction_timestamp: str | None = None
    model_version: str | None = None
    data_sources: list[str] = []
    missing_inputs: list[str] = []
    warnings: list[str] = []


class IncidentCreateRequest(BaseModel):
    name: str
    location: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    severity: str = "medium"
    status: str = "open"
    priority_score: float = 0.0
    notes: Optional[str] = None
    source: str = "manual"


class IncidentResponse(BaseModel):
    id: int
    name: str
    location: str
    latitude: Optional[float]
    longitude: Optional[float]
    severity: str
    status: str
    priority_score: float
    notes: Optional[str]
    source: str


class ResourceCreateRequest(BaseModel):
    name: str
    resource_type: str
    quantity: int = 1
    capacity: int = 1
    availability: int = 1
    location: str = "HQ"
    status: str = "available"


class ResourceResponse(BaseModel):
    id: int
    name: str
    resource_type: str
    quantity: int
    capacity: int
    availability: int
    location: str
    status: str
    is_assigned: bool


class AlertCreateRequest(BaseModel):
    title: str
    severity: str = "medium"
    affected_locations: str = ""
    message: str = ""
    language: str = "en"
    languages: list[str] = ["en", "te"]
    simulated: bool = False


class AlertResponse(BaseModel):
    id: int
    title: str
    severity: str
    affected_locations: str
    message: str
    language: str
    status: str
    simulated: bool
    translations: dict[str, str] = {}


class DemoScenarioRequest(BaseModel):
    scenario: str


class DashboardSummary(BaseModel):
    total_incidents: int
    active_incidents: int
    available_resources: int
    risk_distribution: Dict[str, int]
    recent_alerts: int
    model_status: str


class HealthStatus(BaseModel):
    status: str = "ok"
    app_name: str
    environment: str
    database: str
    model_status: str
    demo_mode: bool
