from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.services.environmental_service import EnvironmentalProviderError, provider

router = APIRouter(prefix="/environment", tags=["environment"])


@router.get("")
def get_environment(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
):
    try:
        return provider.fetch(latitude, longitude)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except EnvironmentalProviderError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/forecast")
def get_environment_forecast(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
):
    try:
        return provider.fetch(latitude, longitude)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except EnvironmentalProviderError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/geocode")
def geocode_location(name: str = Query(..., min_length=1)):
    return {"results": provider.geocode(name)}


@router.get("/reverse-geocode")
def reverse_geocode(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
):
    return provider.reverse_geocode(latitude, longitude)
