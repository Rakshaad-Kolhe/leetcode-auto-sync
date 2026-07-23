"""Badge and display helpers for repository documentation."""

from __future__ import annotations

from typing import Dict


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
