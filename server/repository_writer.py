"""Filesystem utilities to create and update a local LeetCode repository layout.

This module is responsible for writing solution files directly under difficulty
folders (e.g. `Easy/`, `Medium/`, `Hard/`) in the configured target repository (`LEETCODE_REPO_PATH`).
It is intentionally isolated from routing concerns so it can be tested independently.
"""

from __future__ import annotations

import logging
import os
import re
import tempfile
from pathlib import Path
from typing import Dict, Optional

from config import LEETCODE_REPO_PATH
from git_service import InvalidRepositoryError
from schemas import Submission

logger = logging.getLogger(__name__)

LANGUAGE_TO_EXTENSION: Dict[str, str] = {
    "c++": ".cpp",
    "cpp": ".cpp",
    "python3": ".py",
    "python": ".py",
    "java": ".java",
    "javascript": ".js",
    "js": ".js",
    "typescript": ".ts",
    "ts": ".ts",
    "go": ".go",
    "golang": ".go",
    "rust": ".rs",
    "c": ".c",
    "csharp": ".cs",
    "c#": ".cs",
    "kotlin": ".kt",
    "swift": ".swift",
    "ruby": ".rb",
    "php": ".php",
    "dart": ".dart",
    "scala": ".scala",
    "racket": ".rkt",
    "erlang": ".erl",
    "elixir": ".ex",
}


def sanitize_filename(title: str) -> str:
    """Return a filesystem-friendly version of problem title.

    Removes invalid characters (: ? * < > | " \\ /) and collapses repeated spaces.
    """

    cleaned = re.sub(r'[:?\*<>\|"\\/]', "", title)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def get_file_extension(language: str) -> str:
    """Return file extension for normalized language name."""

    clean_lang = language.strip().lower()
    ext = LANGUAGE_TO_EXTENSION.get(clean_lang)
    if not ext:
        raise ValueError(f"unsupported language: {language}")
    return ext


def validate_repository(repo_root: Path) -> None:
    """Validate that `repo_root` exists and contains a `.git` folder."""

    repo_root = Path(repo_root).expanduser().resolve()
    if not repo_root.exists() or not (repo_root / ".git").exists():
        raise InvalidRepositoryError(f"Configured repository path is not a valid git repository:\n{repo_root}")


def _atomic_write(path: Path, content: str) -> None:
    """Write `content` to `path` atomically using a temp file in the same dir."""

    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_path = tempfile.mkstemp(dir=str(path.parent))
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            fh.write(content)
        os.replace(tmp_path, str(path))
    finally:
        try:
            if Path(tmp_path).exists():
                Path(tmp_path).unlink()
        except Exception:
            pass


def write_submission(submission: Submission, repo_path: Optional[Path | str] = None) -> Dict[str, object]:
    """Write solution file for `submission` into `<repo>/<Difficulty>/<Title>.<ext>`.

    Returns a JSON-serializable dict indicating whether the submission created
    new files or updated existing ones.
    """

    repo_root = Path(repo_path or LEETCODE_REPO_PATH).expanduser().resolve()
    validate_repository(repo_root)

    difficulty_folder = repo_root / submission.difficulty
    difficulty_folder.mkdir(parents=True, exist_ok=True)

    sanitized_title = sanitize_filename(submission.title)
    extension = get_file_extension(submission.language)
    filename = f"{sanitized_title}{extension}"
    solution_path = difficulty_folder / filename

    created = not solution_path.exists()
    _atomic_write(solution_path, submission.code)

    relative_output = f"{submission.difficulty}/{filename}"

    logger.info(f"Repository:\n{repo_root}")
    logger.info(f"Difficulty:\n{submission.difficulty}")
    logger.info(f"Output:\n{relative_output}")

    return {
        "status": "created" if created else "updated",
        "problem": {"id": submission.id, "title": submission.title},
        "output_file": relative_output,
        "solution_path": str(solution_path),
    }
