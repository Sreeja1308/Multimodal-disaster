# FloodWatch Disaster Response Dashboard

FloodWatch is a local-first disaster response dashboard for reviewing flood risk, weather conditions, incident data, and emergency report generation. The app is built around the flood-risk dataset shipped in this repository and intentionally presents model output as decision-support rather than a live warning feed.

## Included capabilities

- FastAPI backend with SQLite persistence
- React + Vite + TypeScript frontend
- Flood-risk model status and prediction workflow
- Weather and elevation lookup via Open-Meteo
- Incident, resource, and alert management views
- Demo scenario replay for synthetic operational data
- JSON and Word report generation

## Repository layout

```text
disaster-response-system/
├── backend/
│   ├── app/
│   ├── tests/
│   ├── Dockerfile
│   └── requirements.txt
├── dataset/
│   └── flood_risk_dataset_india.csv
├── frontend/
│   ├── src/
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
├── ml/
│   └── flood_prediction/
├── models/
├── .env.example
├── .gitignore
├── README.md
└── scripts/
```

## Backend setup

```powershell
cd disaster-response-system
py -3.13 -m venv .venv313
.\.venv313\Scripts\Activate.ps1
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

## Frontend setup

```powershell
cd disaster-response-system/frontend
npm install
npm run dev -- --host 0.0.0.0
```

## Environment variables

Copy `.env.example` to `.env` when you want local overrides. The repository dataset is expected at `dataset/flood_risk_dataset_india.csv`.

## Validation

Run backend tests in the project virtual environment:

```powershell
cd disaster-response-system
.\.venv313\Scripts\python -m pytest backend/tests -q
```

Run the frontend production build:

```powershell
cd disaster-response-system/frontend
npm run build
```

## Notes

- This project is educational and operationally-simulated rather than a production flood-warning system.
- The model artifact is treated as a research/demo decision aid until a domain-validated deployment workflow is in place.
- The app can be used with the bundled demo scenario and the local weather provider without exposing a secret key in the frontend.
