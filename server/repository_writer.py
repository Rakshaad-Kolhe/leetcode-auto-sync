"""Filesystem utilities to create and update a local LeetCode repository layout.

This module is responsible for writing solution folders under configured layouts
in the target repository (`LEETCODE_REPO_PATH`).
It is intentionally isolated from routing concerns so it can be tested independently.
"""

from __future__ import annotations

from datetime import datetime, timezone
import logging
import os
import re
import tempfile
from pathlib import Path
from typing import Dict, Optional, Union

from config import LEETCODE_REPO_PATH
from config.config_manager import AppConfig, ConfigManager
from config.folder_layout import (
    get_folder_layout_strategy,
    sanitize_filename as config_sanitize_filename,
)
from documentation.generator import DocumentationGenerator
from documentation.models import ProblemMetadata
from git_service import InvalidRepositoryError
from metadata.metadata_service import MetadataService
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
    "sql": ".sql",
}


def sanitize_filename(title: str) -> str:
    """Return a filesystem-friendly version of problem title."""
    return config_sanitize_filename(title)


def format_problem_folder_name(problem_number: int, title: str) -> str:
    """Return `<zero-padded number>-<sanitized title>` for a problem folder."""
    return f"{problem_number:04d}-{sanitize_filename(title)}"


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


def _leetcode_url(slug: str) -> str:
    return f"https://leetcode.com/problems/{slug.strip('/')}/"


def _current_timestamp() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _read_existing_timestamp(readme_path: Path) -> Optional[str]:
    if not readme_path.exists():
        return None
    lines = readme_path.read_text(encoding="utf-8").splitlines()
    for index, line in enumerate(lines):
        if line.strip() == "Last Updated:":
            if index + 1 < len(lines):
                value = lines[index + 1].strip()
                return value or None
    return None


def write_submission(
    submission: Submission,
    repo_path: Optional[Path | str] = None,
    metadata_service: Optional[MetadataService] = None,
    config: Optional[Union[AppConfig, ConfigManager]] = None,
) -> Dict[str, object]:
    """Write `submission` into local repository layout based on configuration.

    Returns a JSON-serializable dict indicating whether the submission created
    new files or updated existing ones.
    """
    repo_root = Path(repo_path or LEETCODE_REPO_PATH).expanduser().resolve()
    validate_repository(repo_root)

    if isinstance(config, AppConfig):
        app_config = config
    elif isinstance(config, ConfigManager):
        app_config = config.get_config()
    else:
        app_config = ConfigManager.get_instance(repo_root=repo_root).get_config()

    sanitized_title = sanitize_filename(submission.title)
    strategy = get_folder_layout_strategy(app_config.repository.folder_layout)
    relative_folder = strategy.get_relative_folder_path(
        submission.id, submission.title, submission.difficulty, submission.language
    )
    problem_folder = repo_root / relative_folder

    # Legacy migration: difficulty/title -> difficulty/0001-title
    if app_config.repository.folder_layout == "difficulty-number-title":
        legacy_problem_folder = repo_root / submission.difficulty / sanitized_title
        if legacy_problem_folder.exists() and not problem_folder.exists():
            legacy_problem_folder.rename(problem_folder)

    extension = get_file_extension(submission.language)
    solution_path = problem_folder / f"solution{extension}"
    readme_path = problem_folder / "README.md"

    # Evaluate created status BEFORE writing files
    created = not solution_path.exists() or (app_config.repository.auto_generate_readme and not readme_path.exists())

    existing_code = solution_path.read_text(encoding="utf-8") if solution_path.exists() else None
    existing_readme = readme_path.read_text(encoding="utf-8") if readme_path.exists() else None
    generated_at = _read_existing_timestamp(readme_path) if existing_code == submission.code else None

    # Fetch enriched metadata via MetadataService
    service = metadata_service or MetadataService(repo_root=repo_root)
    enriched = service.get_metadata(
        submission.slug,
        problem_number=submission.id,
        title=submission.title,
        difficulty=submission.difficulty,
    )

    metadata = ProblemMetadata(
        problem_number=submission.id,
        title=submission.title,
        slug=submission.slug,
        difficulty=submission.difficulty,
        language=submission.language,
        url=_leetcode_url(submission.slug),
        generated_at=generated_at or _current_timestamp(),
        folder=relative_folder,
        topics=enriched.topic_names(),
        companies=enriched.company_names(),
        acceptance_rate=enriched.acceptance_rate,
        likes=enriched.likes,
        dislikes=enriched.dislikes,
        hints=enriched.hints,
        similar_questions=[
            {"title": r.title, "title_slug": r.title_slug, "difficulty": r.difficulty}
            for r in enriched.similar_questions
        ],
    )

    problem_readme = None
    if app_config.repository.auto_generate_readme:
        generator = DocumentationGenerator(app_config)
        problem_readme = generator.generate_problem_readme(metadata, submission.code)

    from sync.file_diff import FileDiff
    code_changed = FileDiff.has_semantic_change(existing_code, submission.code)
    readme_changed = problem_readme is not None and FileDiff.has_semantic_change(existing_readme, problem_readme)
    changed = code_changed or readme_changed

    if code_changed:
        _atomic_write(solution_path, submission.code)

    if readme_changed and problem_readme is not None:
        _atomic_write(readme_path, problem_readme)

    relative_output = (relative_folder / solution_path.name).as_posix()
    readme_output = (relative_folder / readme_path.name).as_posix()

    return {
        "status": "created" if created else "updated",
        "problem": {"id": submission.id, "title": submission.title},
        "output_file": relative_output,
        "readme_file": readme_output,
        "repository_path": str(repo_root),
        "solution_path": str(solution_path),
        "readme_path": str(readme_path),
        "changed": changed,
    }
