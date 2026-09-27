from __future__ import annotations

import json
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = PROJECT_ROOT / 'backend'
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.services.flood_model_service import FloodModelService


def main():
    dataset_path = PROJECT_ROOT / 'dataset' / 'flood_risk_dataset_india.csv'
    service = FloodModelService(dataset_path=str(dataset_path))
    report = service.train_model()
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
