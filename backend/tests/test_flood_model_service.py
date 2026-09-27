from pathlib import Path

from app.services.flood_model_service import FloodModelService


def test_inspect_dataset_reads_csv():
    dataset_path = Path(__file__).resolve().parents[2] / 'dataset' / 'flood_risk_dataset_india.csv'
    service = FloodModelService(dataset_path=str(dataset_path))
    info = service.inspect_dataset()
    assert info['filename'] == 'flood_risk_dataset_india.csv'
    assert info['shape'][0] > 0
    assert 'Flood Occurred' in info['columns']
    assert 'target_counts' in info
