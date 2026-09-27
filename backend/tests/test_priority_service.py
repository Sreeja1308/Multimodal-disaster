from app.services.priority_service import PriorityService


def test_weights_must_sum_to_one():
    try:
        PriorityService.validate_weights({"flood_risk": 0.5, "population_density": 0.2, "resource_urgency": 0.1, "agent_confidence": 0.1})
    except ValueError as exc:
        assert "sum to 1.0" in str(exc)
    else:
        assert False, "Expected ValueError for invalid weights"


def test_priority_calculation():
    result = PriorityService.compute_priority({
        "flood_risk": 0.9,
        "population_density": 0.8,
        "resource_urgency": 0.7,
        "agent_confidence": 0.6,
    })
    assert result["total"] > 0
    assert set(result["contributions"]).issuperset({"flood_risk", "population_density", "resource_urgency", "agent_confidence"})


def test_default_weights_valid():
    weights = PriorityService.validate_weights(None)
    assert abs(sum(weights.values()) - 1.0) < 1e-6
