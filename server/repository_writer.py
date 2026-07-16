"""Filesystem utilities to create and update a local LeetCode repository layout.

This module is responsible for creating the `Leetcode-solutions/` layout, writing
solution files and per-problem README files. It is intentionally isolated from
routing and business logic so it can be tested independently.
"""

from __future__ import annotations

import os
import re
import tempfile
from pathlib import Path
from typing import Dict

from config import LEETCODE_REPO_PATH
from schemas import Submission


LANGUAGE_TO_FILENAME: Dict[str, str] = {
    "cpp": "solution.cpp",
    "python3": "solution.py",
    "python": "solution.py",
    "java": "Solution.java",
    "javascript": "solution.js",
    "typescript": "solution.ts",
    "go": "solution.go",
    "rust": "solution.rs",
    "c": "solution.c",
    "csharp": "Solution.cs",
    "kotlin": "Solution.kt",
    "swift": "Solution.swift",
}

LANGUAGE_DISPLAY_NAMES: Dict[str, str] = {
    "cpp": "C++",
    "python3": "Python 3",
    "python": "Python",
    "java": "Java",
    "javascript": "JavaScript",
    "typescript": "TypeScript",
    "go": "Go",
    "rust": "Rust",
    "c": "C",
    "csharp": "C#",
    "kotlin": "Kotlin",
    "swift": "Swift",
}


def _sanitize_title(title: str) -> str:
    """Return a filesystem-friendly version of the title.

    Rules:
    - Preserve letters and numbers and spaces
    - Remove other punctuation
    - Replace spaces with hyphens
    - Preserve original capitalization
    """

    # Keep letters, numbers and spaces
    cleaned = re.sub(r"[^\w\s]", "", title)
    # Collapse whitespace
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned.replace(" ", "-")


def _atomic_write(path: Path, content: str) -> None:
    """Write `content` to `path` atomically using a temp file in the same dir."""

    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_path = tempfile.mkstemp(dir=str(path.parent))
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            fh.write(content)
        os.replace(tmp_path, str(path))
    finally:
        # If replace failed, try to clean up
        try:
            if Path(tmp_path).exists():
                Path(tmp_path).unlink()
        except Exception:
            pass


def write_submission(submission: Submission) -> Dict[str, object]:
    """Create or update files for a validated `submission`.

    Returns a JSON-serializable dict indicating whether the submission
    created new files or updated existing ones.
    """

    repo_root = Path(LEETCODE_REPO_PATH) / "Leetcode-solutions"
    repo_root.mkdir(parents=True, exist_ok=True)

    difficulty_dir = repo_root / submission.difficulty

    # Ensure difficulty directory exists
    difficulty_dir.mkdir(parents=True, exist_ok=True)

    sanitized = _sanitize_title(submission.title)
    problem_dir_name = f"{submission.id:04d}-{sanitized}"
    problem_dir = difficulty_dir / problem_dir_name

    created = not problem_dir.exists()
    problem_dir.mkdir(parents=True, exist_ok=True)

    lang_key = submission.language.strip().lower()
    filename = LANGUAGE_TO_FILENAME.get(lang_key)
    if not filename:
        raise ValueError(f"unsupported language: {submission.language}")

    solution_path = problem_dir / filename

    # Write solution file (overwrite if present)
    _atomic_write(solution_path, submission.code)

    # Construct LeetCode URL from slug
    url = f"https://leetcode.com/problems/{submission.slug}/"

    readme_contents = (
        f"# {submission.id}. {submission.title}\n\n"
        f"Difficulty: {submission.difficulty}\n\n"
        f"Language: {LANGUAGE_DISPLAY_NAMES.get(lang_key, submission.language)}\n\n"
        "LeetCode:\n"
        f"{url}\n\n"
        "## Solution\n\n"
        f"See {filename}\n"
    )

    _atomic_write(problem_dir / "README.md", readme_contents)

    return {"status": "created" if created else "updated", "problem": {"id": submission.id, "title": submission.title}}
