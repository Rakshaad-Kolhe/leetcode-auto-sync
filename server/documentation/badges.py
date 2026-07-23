"""Badge and display helpers for repository documentation."""

from __future__ import annotations

from typing import Dict
from urllib.parse import quote


LANGUAGE_DISPLAY: Dict[str, str] = {
    "c++": "C++",
    "cpp": "C++",
    "python3": "Python",
    "python": "Python",
    "java": "Java",
    "javascript": "JavaScript",
    "js": "JavaScript",
    "typescript": "TypeScript",
    "ts": "TypeScript",
    "go": "Go",
    "golang": "Go",
    "rust": "Rust",
    "c": "C",
    "csharp": "C#",
    "c#": "C#",
    "kotlin": "Kotlin",
    "swift": "Swift",
    "ruby": "Ruby",
    "php": "PHP",
    "dart": "Dart",
    "scala": "Scala",
    "racket": "Racket",
    "erlang": "Erlang",
    "elixir": "Elixir",
    "sql": "SQL",
}

LANGUAGE_FENCE: Dict[str, str] = {
    "c++": "cpp",
    "cpp": "cpp",
    "python3": "python",
    "python": "python",
    "java": "java",
    "javascript": "javascript",
    "js": "javascript",
    "typescript": "typescript",
    "ts": "typescript",
    "go": "go",
    "golang": "go",
    "rust": "rust",
    "c": "c",
    "csharp": "csharp",
    "c#": "csharp",
    "kotlin": "kotlin",
    "swift": "swift",
    "ruby": "ruby",
    "php": "php",
    "dart": "dart",
    "scala": "scala",
    "racket": "racket",
    "erlang": "erlang",
    "elixir": "elixir",
    "sql": "sql",
}

DIFFICULTY_COLORS: Dict[str, str] = {
    "Easy": "brightgreen",
    "Medium": "orange",
    "Hard": "red",
}

LANGUAGE_BADGE_COLOR = "blue"


def difficulty_badge(difficulty: str) -> str:
    """Return the display value for a difficulty badge."""

    return difficulty.strip().title()


def language_badge(language: str) -> str:
    """Return a display name for a language."""

    key = language.strip().lower()
    if key.startswith("python"):
        return "Python"
    return LANGUAGE_DISPLAY.get(key, language.strip())


def language_fence(language: str) -> str:
    """Return the fenced-code language identifier."""

    return LANGUAGE_FENCE.get(language.strip().lower(), language.strip().lower())


def difficulty_indicator(difficulty: str) -> str:
    """Return a compact visual difficulty label for index tables."""

    normalized = difficulty_badge(difficulty)
    indicators = {
        "Easy": "🟢 Easy",
        "Medium": "🟠 Medium",
        "Hard": "🔴 Hard",
    }
    return indicators.get(normalized, normalized)


def difficulty_badge_color(difficulty: str) -> str:
    """Return the Shields color for a difficulty."""

    return DIFFICULTY_COLORS.get(difficulty_badge(difficulty), "lightgrey")


def shields_badge(label: str, message: str, color: str) -> str:
    """Render a reusable GitHub Shields badge markdown image."""

    encoded_label = quote(label, safe="")
    encoded_message = quote(message, safe="")
    encoded_color = quote(color, safe="")
    return f"![{label}](https://img.shields.io/badge/{encoded_label}-{encoded_message}-{encoded_color})"


def difficulty_shields_badge(difficulty: str) -> str:
    """Render a difficulty badge."""

    normalized = difficulty_badge(difficulty)
    return shields_badge("Difficulty", normalized, difficulty_badge_color(normalized))


def language_shields_badge(language: str) -> str:
    """Render a language badge."""

    return shields_badge("Language", language_badge(language), LANGUAGE_BADGE_COLOR)
