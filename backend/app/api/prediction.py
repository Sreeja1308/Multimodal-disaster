from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.schemas import FloodPredictRequest
from app.services.environmental_service import provider
from app.services.flood_model_service import FloodModelService

router = APIRouter(prefix="/prediction", tags=["prediction"])
service = FloodModelService()


class DailyRiskRequest(BaseModel):
    latitude: float
    longitude: float
    land_cover: str = "Agricultural"
    soil_type: str = "Loam"
    population_density: float = 5000.0
    infrastructure: int = 0
    historical_floods: int = 0
    river_discharge: float | None = None
    water_level_m: float | None = None


@router.get("/status")
def get_prediction_status():
    return service.status()


@router.post("/predict")
def predict_flood(request: FloodPredictRequest):
    try:
        if not service.model_path.exists():
            return {
                "status": "not_trained",
                "message": "Model not trained. No forecast was generated.",
                "prediction": None,
                "probability": None,
                "label": "unavailable",
                "model_name": None,
            }
        result = service.predict(request.model_dump())
        result["prediction_timestamp"] = datetime.now(timezone.utc).isoformat()
        return result
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}") from exc


@router.post("/daily-risk")
def daily_risk(request: DailyRiskRequest):
    if not service.model_path.exists():
        return {"status": "ok", "location": {"latitude": request.latitude, "longitude": request.longitude}, "model_status": "not_trained", "days": [], "warnings": ["Model not trained. No forecast was generated."]}

    try:
        status = service.status()
        if status.get("status") == "trained" and status.get("usable_for_decisions") is False:
            return {"status": "ok", "location": {"latitude": request.latitude, "longitude": request.longitude}, "model_status": "not_usable", "days": [], "warnings": ["Model below baseline — no forecast shown."]}

        forecast = provider.fetch(request.latitude, request.longitude)
        location_info = provider.reverse_geocode(request.latitude, request.longitude) or {"display_name": f"{request.latitude}, {request.longitude}"}
        days = []
        current_humidity = forecast.get("values", {}).get("humidity_pct")
        elevation = forecast.get("values", {}).get("elevation_m")
        for idx, day in enumerate(forecast.get("daily_forecast", [])):
            payload = {
                "latitude": request.latitude,
                "longitude": request.longitude,
                "rainfall_mm": float(day.get("precipitation_mm") or 0.0),
                "temperature_c": float(day.get("temperature_max_c") or 0.0),
                "humidity_pct": float(current_humidity if current_humidity is not None else 0.0),
                "river_discharge": float(request.river_discharge if request.river_discharge is not None else 0.0),
                "water_level_m": float(request.water_level_m if request.water_level_m is not None else 0.0),
                "elevation_m": float(elevation if elevation is not None else 0.0),
                "land_cover": request.land_cover,
                "soil_type": request.soil_type,
                "population_density": request.population_density,
                "infrastructure": request.infrastructure,
                "historical_floods": request.historical_floods,
            }
            prediction = service.predict(payload)
            risk = "low"
            if prediction.get("label") == "flood":
                risk = "high"
            if prediction.get("probability") is not None and prediction["probability"] >= 0.75:
                risk = "critical"
            elif prediction.get("probability") is not None and prediction["probability"] >= 0.5:
                risk = "medium"
            days.append({
                "date": day.get("date"),
                "label": day.get("label") or ("Today" if idx == 0 else "Tomorrow" if idx == 1 else f"Day {idx + 1}"),
                "temperature_min_c": day.get("temperature_min_c"),
                "temperature_max_c": day.get("temperature_max_c"),
                "precipitation_mm": day.get("precipitation_mm"),
                "probability": prediction.get("probability"),
                "risk": risk,
                "top_factors": prediction.get("explanation", {}).get("top_factors", []),
            })
        return {
            "status": "ok",
            "location": location_info,
            "model_status": "trained",
            "days": days,
            "warnings": [status.get("metadata", {}).get("target_definition", "")],
        }
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"Daily risk prediction failed: {exc}") from exc


@router.get("/dataset-inspect")
def inspect_dataset():
    return service.inspect_dataset()
