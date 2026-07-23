"""Repository scanning and statistics for generated LeetCode documentation."""

from __future__ import annotations

import re
from collections import Counter
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from .badges import language_badge
from .models import ProblemMetadata, RepositoryStatistics

DIFFICULTY_FOLDERS = ("Easy", "Medium", "Hard")
README_NAME = "README.md"
SOLUTION_BASENAME = "solution"

EXTENSION_TO_LANGUAGE: Dict[str, str] = {
    ".cpp": "cpp",
    ".py": "python3",
    ".java": "java",
    ".js": "javascript",
    ".ts": "typescript",
    ".go": "go",
    ".rs": "rust",
    ".c": "c",
    ".cs": "csharp",
    ".kt": "kotlin",
    ".swift": "swift",
    ".rb": "ruby",
    ".php": "php",
    ".dart": "dart",
    ".scala": "scala",
    ".rkt": "racket",
    ".erl": "erlang",
    ".ex": "elixir",
    ".sql": "sql",
}


def scan_repository(repo_root: Path) -> List[ProblemMetadata]:
    """Return generated problem metadata discovered in a solutions repository."""

    root = Path(repo_root).expanduser().resolve()
    problems: List[ProblemMetadata] = []

    for difficulty in DIFFICULTY_FOLDERS:
        difficulty_dir = root / difficulty
        if not difficulty_dir.exists():
            continue

        for problem_dir in sorted(child for child in difficulty_dir.iterdir() if child.is_dir()):
            metadata = _metadata_from_problem_dir(root, difficulty, problem_dir)
            if metadata:
                problems.append(metadata)

    return sorted(problems, key=lambda problem: (problem.problem_number, problem.title))


def generate_statistics(problems: List[ProblemMetadata]) -> RepositoryStatistics:
    """Compute repository statistics from problem metadata."""

    difficulty_counts = Counter(problem.difficulty for problem in problems)
    languages = Counter(language_badge(problem.language) for problem in problems)
    latest = sorted(problems, key=lambda problem: (problem.generated_at, -problem.problem_number), reverse=True)[:10]
    by_timestamp = sorted(problems, key=lambda problem: (problem.generated_at, -problem.problem_number), reverse=True)
    newest = by_timestamp[0] if by_timestamp else None
    oldest = by_timestamp[-1] if by_timestamp else None
    generated_at = newest.generated_at if newest else "N/A"

    return RepositoryStatistics(
        total_solved=len(problems),
        easy_solved=difficulty_counts.get("Easy", 0),
        medium_solved=difficulty_counts.get("Medium", 0),
        hard_solved=difficulty_counts.get("Hard", 0),
        language_distribution=dict(languages),
        latest_solved=latest,
        newest_problem=newest,
        oldest_problem=oldest,
        generated_at=generated_at,
    )


def _metadata_from_problem_dir(root: Path, difficulty: str, problem_dir: Path) -> Optional[ProblemMetadata]:
    readme = problem_dir / README_NAME
    solution = _solution_file(problem_dir)
    if solution is None:
        return None

    content = readme.read_text(encoding="utf-8") if readme.exists() else ""
    parsed = _parse_problem_readme(content) if content else None
    if parsed is None:
        parsed = _parse_legacy_dir(problem_dir.name)
    if parsed is None:
        return None

    number, title = parsed
    language = _parse_section(content, "Language") or EXTENSION_TO_LANGUAGE.get(solution.suffix.lower(), "Unknown")
    url = _parse_section(content, "Problem") or ""
    slug = _slug_from_url(url) or _slugify(title)
    generated_at = _parse_last_updated(content) or "N/A"

    return ProblemMetadata(
        problem_number=number,
        title=title,
        slug=slug,
        difficulty=difficulty,
        language=language,
        url=url,
        generated_at=generated_at,
        folder=problem_dir.relative_to(root),
    )


def _solution_file(problem_dir: Path) -> Optional[Path]:
    candidates = sorted(
        child
        for child in problem_dir.iterdir()
        if child.is_file() and child.stem.lower() == SOLUTION_BASENAME and child.name != README_NAME
    )
    return candidates[0] if candidates else None


def _parse_problem_readme(content: str) -> Optional[Tuple[int, str]]:
    match = re.search(r"^#\s+(\d+)\.\s+(.+)$", content, flags=re.MULTILINE)
    if not match:
        return None
    return int(match.group(1)), match.group(2).strip()


def _parse_legacy_dir(name: str) -> Optional[Tuple[int, str]]:
    match = re.match(r"^(\d+)-(.+)$", name)
    if not match:
        return None
    return int(match.group(1)), match.group(2).replace("-", " ").strip()


def _parse_section(content: str, section: str) -> Optional[str]:
    pattern = rf"^##\s+{re.escape(section)}\s*$\n+(.+?)(?:\n\n---|\Z)"
    match = re.search(pattern, content, flags=re.MULTILINE | re.DOTALL)
    if not match:
        return None
    value = match.group(1).strip()
    return value if value else None


def _parse_last_updated(content: str) -> Optional[str]:
    match = re.search(r"Last Updated:\s*\n(.+)", content)
    if not match:
        return None
    return match.group(1).strip()


def _slug_from_url(url: str) -> Optional[str]:
    match = re.search(r"/problems/([^/]+)/?", url)
    if not match:
        return None
    return match.group(1)


def _slugify(title: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    return slug or "unknown"
