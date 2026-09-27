from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_generate_word_report_returns_docx():
    response = client.post(
        '/reports/generate.docx',
        json={'latitude': 20.5, 'longitude': 78.9, 'prediction': {'status': 'not_trained'}},
    )
    assert response.status_code == 200
    assert response.headers['content-type'].startswith('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    assert response.content[:2] == b'PK'
