from __future__ import annotations

TEMPLATES = {
    "en": "Flood warning for {location}. Severity: {severity}. {message}",
    "te": "{location} ప్రాంతానికి వరద హెచ్చరిక. తీవ్రత: {severity}. {message}",
}


def translate(draft: dict[str, str], language: str) -> str:
    template = TEMPLATES.get(language, TEMPLATES["en"])
    values = {
        "location": draft.get("location", "the region"),
        "severity": draft.get("severity", "medium"),
        "message": draft.get("message", ""),
    }
    return template.format(**values)
