from __future__ import annotations

from pathlib import Path
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    app_name: str = "Disaster Response System"
    app_env: str = "development"
    backend_port: int = 8001
    database_url: str = f"sqlite:///{PROJECT_ROOT / 'disaster.db'}"
    dataset_path: str = str(PROJECT_ROOT / "dataset" / "flood_risk_dataset_india.csv")
    model_dir: str = str(PROJECT_ROOT / "models")
    secret_key: str = "change-me-in-production"
    cors_origins: List[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    enable_demo_scenarios: bool = True

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        protected_namespaces=(),
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value):
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


settings = Settings()
