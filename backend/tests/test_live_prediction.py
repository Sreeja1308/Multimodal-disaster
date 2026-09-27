from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.environmental_service import EnvironmentalProviderError, OpenMeteoProvider
from app.services.flood_model_service import FloodModelService


client = TestClient(app)


def test_prediction_rejects_invalid_coordinates():
    response = client.post('/prediction/predict', json={'latitude': 100, 'longitude': 78})
    assert response.status_code == 422


def test_model_status_reports_artifact_state():
    response = client.get('/prediction/status')
    assert response.status_code == 200
    body = response.json()
    assert {'status', 'available', 'compatible', 'message'} <= body.keys()


def test_provider_preserves_unavailable_river_inputs(monkeypatch):
    class Response:
        def raise_for_status(self):
            return None

        def json(self):
            return {
                'current': {'time': '2026-09-21T00:00', 'temperature_2m': 28, 'relative_humidity_2m': 70, 'precipitation': 2, 'wind_speed_10m': 10},
                'hourly': {'precipitation': [1, 2, 3]},
                'daily': {
                    'time': ['2026-09-21'],
                    'temperature_2m_max': [32],
                    'temperature_2m_min': [24],
                    'precipitation_sum': [5],
                    'precipitation_probability_max': [60],
                    'wind_speed_10m_max': [20],
                },
            }

    class Client:
        def __init__(self, **kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def get(self, *args, **kwargs):
            response = Response()
            if 'elevation' in args[0]:
                response.json = lambda: {'elevation': [100]}
            return response

    monkeypatch.setattr('app.services.environmental_service.httpx.Client', Client)
    result = OpenMeteoProvider().fetch(20, 78)
    assert result['values']['temperature_c'] == 28
    assert result['daily_forecast'][0]['temperature_max_c'] == 32
    assert result['unavailable']['river_discharge']
