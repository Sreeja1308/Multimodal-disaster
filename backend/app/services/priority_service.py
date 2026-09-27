from __future__ import annotations

from typing import Dict, Optional


DEFAULT_WEIGHTS = {
    "flood_risk": 0.40,
    "population_density": 0.30,
    "resource_urgency": 0.20,
    "agent_confidence": 0.10,
}


class PriorityService:
    @staticmethod
    def validate_weights(weights: Optional[Dict[str, float]]) -> Dict[str, float]:
        if weights is None:
            weights = DEFAULT_WEIGHTS.copy()
        normalized = {key: float(value) for key, value in weights.items()}
        required = ["flood_risk", "population_density", "resource_urgency", "agent_confidence"]
        for key in required:
            if key not in normalized:
                raise ValueError(f"Missing weight for {key}")
        for key, value in normalized.items():
            if not 0.0 <= value <= 1.0:
                raise ValueError(f"Priority weight for {key} must be in [0, 1].")
        total = sum(normalized.values())
        if abs(total - 1.0) > 1e-6:
            raise ValueError(f"Priority weights must sum to 1.0. Current total is {total}.")
        return normalized

    @staticmethod
    def compute_priority(score_inputs: Dict[str, float], weights: Optional[Dict[str, float]] = None) -> Dict[str, float]:
        validated = PriorityService.validate_weights(weights)
        raw = {
            "flood_risk": float(score_inputs.get("flood_risk", 0.0)),
            "population_density": float(score_inputs.get("population_density", 0.0)),
            "resource_urgency": float(score_inputs.get("resource_urgency", 0.0)),
            "agent_confidence": float(score_inputs.get("agent_confidence", 0.0)),
        }
        for key, value in raw.items():
            if not 0.0 <= value <= 1.0:
                raise ValueError(f"Priority score input '{key}' must be in [0, 1].")

        contribution = {
            "flood_risk": round(raw["flood_risk"] * validated["flood_risk"], 4),
            "population_density": round(raw["population_density"] * validated["population_density"], 4),
            "resource_urgency": round(raw["resource_urgency"] * validated["resource_urgency"], 4),
            "agent_confidence": round(raw["agent_confidence"] * validated["agent_confidence"], 4),
        }
        total = round(sum(contribution.values()), 4)
        return {"total": total, "contributions": contribution, "weights": validated}


priority_service = PriorityService()
