from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_generate_report_returns_structured_assessment():
    response = client.post(
        '/reports/generate',
        json={
            'latitude': 20.5,
            'longitude': 78.9,
            'environment': {
                'provider': 'Open-Meteo',
                'observed_at': '2026-09-21T10:00:00Z',
                'retrieved_at': '2026-09-21T10:01:00Z',
                'values': {'rainfall_mm': 4.2},
                'unavailable': {'river_discharge': 'not configured'},
                'sources': {'weather': 'https://api.open-meteo.com/'},
            },
            'prediction': {
                'status': 'ok',
                'label': 'no_flood',
                'probability': 0.2,
                'model_version': 'random_forest',
                'warnings': ['research model'],
                'data_sources': ['caller supplied environmental inputs'],
            },
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body['risk_assessment']['risk_level'] == 'no_flood'
    assert body['observed_environment']['values']['rainfall_mm'] == 4.2
    assert 'recommended_precautions' in body
