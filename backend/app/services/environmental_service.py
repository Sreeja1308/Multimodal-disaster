from __future__ import annotations

from datetime import datetime, timezone
from itertools import zip_longest
from typing import Any

import httpx


class EnvironmentalProviderError(RuntimeError):
    """Raised when an external environmental provider cannot be used."""


class OpenMeteoProvider:
    name = "Open-Meteo"
    forecast_url = "https://api.open-meteo.com/v1/forecast"
    elevation_url = "https://api.open-meteo.com/v1/elevation"
    geocoding_url = "https://geocoding-api.open-meteo.com/v1/search"
    reverse_geocode_url = "https://nominatim.openstreetmap.org/reverse"
    air_quality_url = "https://air-quality-api.open-meteo.com/v1/air-quality"

    def fetch(self, latitude: float, longitude: float) -> dict[str, Any]:
        if not -90 <= latitude <= 90 or not -180 <= longitude <= 180:
            raise ValueError("Latitude must be between -90 and 90 and longitude between -180 and 180")

        params = {
            "latitude": latitude,
            "longitude": longitude,
            "current": "temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m",
            "hourly": "temperature_2m,precipitation,precipitation_probability,weather_code",
            "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max",
            "forecast_days": 7,
            "timezone": "UTC",
        }
        try:
            with httpx.Client(timeout=12.0) as client:
                weather_response = client.get(self.forecast_url, params=params)
                weather_response.raise_for_status()
                weather = weather_response.json()
                elevation_response = client.get(
                    self.elevation_url,
                    params={"latitude": latitude, "longitude": longitude},
                )
                elevation_response.raise_for_status()
                elevation = elevation_response.json()
                air_quality = self.fetch_air_quality(latitude, longitude)
        except (httpx.HTTPError, ValueError) as exc:
            raise EnvironmentalProviderError(f"{self.name} request failed: {exc}") from exc

        current = weather.get("current") or {}
        hourly = weather.get("hourly") or {}
        daily = weather.get("daily") or {}
        elevation_values = elevation.get("elevation") or []
        observation_time = current.get("time") or datetime.now(timezone.utc).isoformat()
        hourly_precipitation = hourly.get("precipitation") or []
        hourly_probability = hourly.get("precipitation_probability") or []
        hourly_temperature = hourly.get("temperature_2m") or []
        hourly_weather_codes = hourly.get("weather_code") or []
        recent_rainfall = sum(float(value or 0) for value in hourly_precipitation[:6]) if hourly_precipitation else None

        daily_times = daily.get("time", [])
        daily_max = daily.get("temperature_2m_max", [])
        daily_min = daily.get("temperature_2m_min", [])
        daily_precip = daily.get("precipitation_sum", [])
        daily_probability = daily.get("precipitation_probability_max", [])
        daily_wind = daily.get("wind_speed_10m_max", [])
        daily_weather = daily.get("weather_code", [])

        daily_forecast = [
            {
                "date": date,
                "label": "Today" if index == 0 else "Tomorrow" if index == 1 else None,
                "temperature_max_c": maximum,
                "temperature_min_c": minimum,
                "precipitation_mm": precipitation,
                "precipitation_probability_pct": probability,
                "wind_speed_max_kmh": wind,
                "weather_code": weather_code,
            }
            for index, (date, maximum, minimum, precipitation, probability, wind, weather_code) in enumerate(zip_longest(
                daily_times,
                daily_max,
                daily_min,
                daily_precip,
                daily_probability,
                daily_wind,
                daily_weather,
                fillvalue=None,
            ))
        ]

        hourly_limit = min(len(hourly.get("time", [])), len(hourly_temperature), len(hourly_precipitation), len(hourly_probability), len(hourly_weather_codes)) if hourly.get("time") else 0
        hourly_forecast = [
            {
                "time": hourly.get("time", [])[index],
                "temperature_c": hourly_temperature[index],
                "precipitation_mm": hourly_precipitation[index],
                "precipitation_probability_pct": hourly_probability[index],
                "weather_code": hourly_weather_codes[index] if index < len(hourly_weather_codes) else None,
            }
            for index in range(hourly_limit)[:24]
        ]

        return {
            "latitude": latitude,
            "longitude": longitude,
            "provider": self.name,
            "observed_at": observation_time,
            "retrieved_at": datetime.now(timezone.utc).isoformat(),
            "values": {
                "rainfall_mm": current.get("precipitation"),
                "recent_rainfall_6h_mm": recent_rainfall,
                "temperature_c": current.get("temperature_2m"),
                "humidity_pct": current.get("relative_humidity_2m"),
                "wind_speed_kmh": current.get("wind_speed_10m"),
                "weather_code": current.get("weather_code"),
                "elevation_m": elevation_values[0] if elevation_values else None,
            },
            "hourly_forecast": hourly_forecast,
            "daily_forecast": daily_forecast,
            "air_quality": air_quality,
            "sources": {
                "weather": self.forecast_url,
                "elevation": self.elevation_url,
                "air_quality": self.air_quality_url,
            },
            "unavailable": {
                "river_discharge": "No river observation provider is configured.",
                "water_level_m": "No river observation provider is configured.",
                "land_cover": "Not supplied by the environmental provider.",
                "soil_type": "Not supplied by the environmental provider.",
                "population_density": "Not supplied by the environmental provider.",
                "infrastructure": "Not supplied by the environmental provider.",
                "historical_floods": "Not supplied by the environmental provider.",
            },
        }

    def fetch_air_quality(self, latitude: float, longitude: float) -> dict[str, Any] | None:
        params = {
            "latitude": latitude,
            "longitude": longitude,
            "current": "pm10,pm2_5,european_aqi,grass_pollen,birch_pollen,ragweed_pollen",
            "timezone": "UTC",
        }
        try:
            with httpx.Client(timeout=10.0) as client:
                response = client.get(self.air_quality_url, params=params)
                response.raise_for_status()
                payload = response.json()
        except (httpx.HTTPError, ValueError):
            return None
        current = payload.get("current") or {}
        return {
            "observed_at": current.get("time"),
            "values": {
                "pm2_5": current.get("pm2_5"),
                "pm10": current.get("pm10"),
                "european_aqi": current.get("european_aqi"),
                "grass_pollen": current.get("grass_pollen"),
                "birch_pollen": current.get("birch_pollen"),
                "ragweed_pollen": current.get("ragweed_pollen"),
            },
        }

    def geocode(self, query: str) -> list[dict[str, Any]]:
        try:
            with httpx.Client(timeout=10.0) as client:
                response = client.get(self.geocoding_url, params={"name": query, "count": 5, "language": "en"})
                response.raise_for_status()
                payload = response.json()
        except (httpx.HTTPError, ValueError):
            return []
        results = payload.get("results") or []
        return [{
            "name": item.get("name"),
            "latitude": item.get("latitude"),
            "longitude": item.get("longitude"),
            "country": item.get("country"),
            "admin1": item.get("admin1"),
            "timezone": item.get("timezone"),
        } for item in results]

    def reverse_geocode(self, latitude: float, longitude: float) -> dict[str, Any] | None:
        try:
            with httpx.Client(timeout=8.0) as client:
                response = client.get(
                    self.reverse_geocode_url,
                    params={"lat": latitude, "lon": longitude, "format": "json"},
                    headers={"User-Agent": "FloodWatchPrototype/0.1"},
                )
                response.raise_for_status()
                payload = response.json()
        except (httpx.HTTPError, ValueError):
            return None
        if not payload:
            return None
        address = payload.get("address") or {}
        return {
            "display_name": payload.get("display_name"),
            "city": address.get("city") or address.get("town") or address.get("village") or address.get("municipality"),
            "state": address.get("state") or address.get("state_district") or address.get("county"),
            "country": address.get("country"),
        }


provider = OpenMeteoProvider()
