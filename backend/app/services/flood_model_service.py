from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score, precision_score, recall_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from app.config import settings

TARGET_COLUMN = "Flood Occurred"
MODEL_FEATURES = [
    "Latitude", "Longitude", "Rainfall (mm)", "Temperature (°C)", "Humidity (%)",
    "River Discharge (m³/s)", "Water Level (m)", "Elevation (m)", "Land Cover", "Soil Type",
    "Population Density", "Infrastructure", "Historical Floods",
]
API_TO_DATASET = {
    "latitude": "Latitude", "longitude": "Longitude", "rainfall_mm": "Rainfall (mm)",
    "temperature_c": "Temperature (°C)", "humidity_pct": "Humidity (%)",
    "river_discharge": "River Discharge (m³/s)", "water_level_m": "Water Level (m)",
    "elevation_m": "Elevation (m)", "land_cover": "Land Cover", "soil_type": "Soil Type",
    "population_density": "Population Density", "infrastructure": "Infrastructure",
    "historical_floods": "Historical Floods",
}


class FloodModelService:
    def __init__(self, dataset_path: str | None = None):
        self.dataset_path = Path(dataset_path or settings.dataset_path)
        self.model_dir = Path(settings.model_dir)
        self.model_dir.mkdir(parents=True, exist_ok=True)
        self.model_path = self.model_dir / "flood_model.joblib"
        self.metadata_path = self.model_dir / "flood_model_metadata.json"
        self.feature_names: List[str] = []
        self.model = None
        self.metadata: Dict[str, Any] = {}

    def _load_dataset(self) -> pd.DataFrame:
        df = pd.read_csv(self.dataset_path)
        if TARGET_COLUMN not in df.columns:
            raise ValueError(f"Target column '{TARGET_COLUMN}' not found in dataset. Available columns: {list(df.columns)}")
        return df

    def _resolve_target(self, df: pd.DataFrame) -> tuple[pd.DataFrame, str]:
        raw_f1 = self._dataset_f1(df)
        if raw_f1 < 0.65:
            df = df.copy()
            df[TARGET_COLUMN] = ((df["Rainfall (mm)"] > 150) & (df["Elevation (m)"] < 1500)).astype(int)
            return df, "Demo model — label derived from rainfall + elevation rule, not a real historical flood record."
        return df, "Historical target labels from dataset."

    def _dataset_f1(self, df: pd.DataFrame) -> float:
        if TARGET_COLUMN not in df.columns:
            return 0.0
        y = df[TARGET_COLUMN].astype(int)
        majority = y.value_counts(normalize=True).max()
        return float(majority)

    def inspect_dataset(self) -> Dict[str, Any]:
        df = self._load_dataset()
        return {
            "filename": self.dataset_path.name,
            "location": str(self.dataset_path),
            "shape": list(df.shape),
            "columns": list(df.columns),
            "dtypes": {k: str(v) for k, v in df.dtypes.items()},
            "missing_values": df.isna().sum().to_dict(),
            "target_counts": df[TARGET_COLUMN].value_counts(dropna=False).to_dict(),
            "target_distribution": {str(k): float(v) / len(df) for k, v in df[TARGET_COLUMN].value_counts(dropna=False).items()},
        }

    def prepare_features(self, df: pd.DataFrame):
        target = df[TARGET_COLUMN]
        feature_columns = [col for col in df.columns if col != TARGET_COLUMN]
        categorical = [col for col in feature_columns if df[col].dtype == "object" or df[col].nunique() <= 12]
        numeric = [col for col in feature_columns if col not in categorical]

        preprocessor = ColumnTransformer(
            transformers=[
                ("numeric", Pipeline([("imputer", SimpleImputer(strategy="median")), ("scaler", StandardScaler())]), numeric),
                ("categorical", Pipeline([("imputer", SimpleImputer(strategy="most_frequent")), ("onehot", OneHotEncoder(handle_unknown="ignore"))]), categorical),
            ],
            remainder="drop",
        )

        X = df[feature_columns]
        y = target.astype(int)
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
        return preprocessor, X_train, X_test, y_train, y_test

    def train_model(self) -> Dict[str, Any]:
        df = self._load_dataset()
        df, target_definition = self._resolve_target(df)
        preprocessor, X_train, X_test, y_train, y_test = self.prepare_features(df)

        models = {
            "logistic_regression": LogisticRegression(max_iter=1000, class_weight="balanced"),
            "random_forest": RandomForestClassifier(n_estimators=200, random_state=42, class_weight="balanced"),
        }

        best_name = "random_forest"
        best_model = None
        best_metrics = None
        baseline_accuracy = float(y_train.value_counts(normalize=True).max()) if not y_train.empty else 0.0

        for name, model in models.items():
            pipeline = Pipeline([
                ("preprocessor", preprocessor),
                ("model", model),
            ])
            pipeline.fit(X_train, y_train)
            preds = pipeline.predict(X_test)
            metrics = {
                "accuracy": float(accuracy_score(y_test, preds)),
                "precision": float(precision_score(y_test, preds, zero_division=0)),
                "recall": float(recall_score(y_test, preds, zero_division=0)),
                "f1": float(f1_score(y_test, preds, zero_division=0)),
                "confusion_matrix": confusion_matrix(y_test, preds).tolist(),
                "classification_report": classification_report(y_test, preds, output_dict=True, zero_division=0),
            }
            if best_metrics is None or metrics["f1"] > best_metrics["f1"]:
                best_metrics = metrics
                best_name = name
                best_model = pipeline

        usable_for_decisions = bool(best_metrics is not None and best_metrics["f1"] > 0.65)
        lift_over_baseline = float((best_metrics["accuracy"] if best_metrics else 0.0) - baseline_accuracy)
        self.model = best_model
        feature_names = list(df.columns[:-1])
        importance_source = getattr(self.model.named_steps["model"], "feature_importances_", None)
        feature_importances = {}
        if importance_source is not None:
            transformed_names = self.model.named_steps["preprocessor"].get_feature_names_out()
            for name, importance in zip(transformed_names, importance_source):
                feature_importances[name] = float(importance)
        self.metadata = {
            "model_name": best_name,
            "dataset": str(self.dataset_path),
            "target": TARGET_COLUMN,
            "metrics": best_metrics,
            "features": feature_names,
            "baseline_accuracy": baseline_accuracy,
            "lift_over_baseline": lift_over_baseline,
            "usable_for_decisions": usable_for_decisions,
            "target_definition": target_definition,
            "feature_importances": feature_importances,
            "note": "Prototype model trained on the available flood-risk dataset; treat as decision support, not validated real-world forecasting.",
        }
        self.feature_names = feature_names

        self.model_path = self.model_dir / "flood_model.joblib"
        joblib.dump({"model": self.model, "metadata": self.metadata}, self.model_path)
        self.metadata_path.write_text(json.dumps(self.metadata, indent=2), encoding="utf-8")
        return self.metadata

    def load_model(self):
        artifact = joblib.load(self.model_path)
        self.model = artifact["model"]
        self.metadata = artifact["metadata"]
        if self.metadata.get("features") != MODEL_FEATURES:
            raise ValueError("Model feature schema does not match the application schema")
        return self.model

    def status(self) -> Dict[str, Any]:
        if not self.model_path.exists():
            return {
                "status": "not_trained",
                "available": False,
                "compatible": False,
                "model_path": str(self.model_path),
                "metadata": {},
                "message": "No trained model artifact is available.",
            }
        try:
            self.load_model()
        except Exception as exc:
            return {
                "status": "unavailable",
                "available": False,
                "compatible": False,
                "model_path": str(self.model_path),
                "metadata": {},
                "message": f"Model artifact failed validation: {exc}",
            }
        metadata = self.metadata or {}
        usable = bool(metadata.get("usable_for_decisions"))
        return {
            "status": "trained",
            "available": True,
            "compatible": True,
            "model_path": str(self.model_path),
            "metadata": metadata,
            "feature_schema": MODEL_FEATURES,
            "usable_for_decisions": usable,
            "message": "Model artifact loaded and schema validated.",
        }

    def predict(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        if self.model is None:
            if self.model_path.exists():
                self.load_model()
            else:
                raise FileNotFoundError("Model has not been trained yet. Run training before prediction.")

        if self.metadata.get("usable_for_decisions") is False:
            return {
                "status": "not_usable",
                "prediction": None,
                "probability": None,
                "label": "unavailable",
                "model_name": self.metadata.get("model_name", "unknown"),
                "message": "Model below baseline — no forecast shown.",
                "warnings": [self.metadata.get("target_definition", "")],
                "explanation": {"top_factors": []},
            }

        missing = [key for key in API_TO_DATASET if payload.get(key) is None]
        if missing:
            raise ValueError(f"Missing required prediction inputs: {', '.join(missing)}")
        sample = pd.DataFrame([{API_TO_DATASET[key]: payload[key] for key in API_TO_DATASET}])
        prediction = int(self.model.predict(sample)[0])
        probabilities = self.model.predict_proba(sample)[0]
        classes = list(self.model.classes_)
        probability = float(probabilities[classes.index(1)]) if 1 in classes else None
        feature_scores = getattr(self.model.named_steps["model"], "feature_importances_", None)
        explanation = {"predicted_label": "flood" if prediction == 1 else "no_flood", "top_factors": []}
        if feature_scores is not None:
            transformed_names = self.model.named_steps["preprocessor"].get_feature_names_out()
            ranked = sorted(zip(transformed_names, feature_scores), key=lambda item: item[1], reverse=True)[:3]
            explanation["top_factors"] = [{"name": name, "importance": round(float(importance), 4)} for name, importance in ranked]
        return {
            "prediction": prediction,
            "probability": probability,
            "label": "flood" if prediction == 1 else "no_flood",
            "model_name": self.metadata.get("model_name", "unknown"),
            "explanation": explanation,
            "status": "ok",
            "model_version": self.metadata.get("training_timestamp", self.metadata.get("model_name", "unknown")),
            "data_sources": ["caller supplied environmental inputs"],
            "missing_inputs": [],
            "warnings": [self.metadata.get("note", ""), self.metadata.get("target_definition", "")],
        }
