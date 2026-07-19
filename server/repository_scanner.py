"""Scan the LeetCode solutions repository to discover problems and statistics.

This module inspects the filesystem under the configured `LEETCODE_REPO_PATH`
and returns a list of problems and basic difficulty statistics.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from config import LEETCODE_REPO_PATH

FOLDER_ORDER = ("Easy", "Medium", "Hard")
SOLUTIONS_DIR_NAME = "Leetcode-solutions"

EXT_TO_LANG: Dict[str, str] = {
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
}

FILENAME_TO_LANG: Dict[str, str] = {
    "solution.cpp": "cpp",
    "solution.py": "python3",
    "Solution.java": "java",
    "solution.js": "javascript",
    "solution.ts": "typescript",
    "solution.go": "go",
    "solution.rs": "rust",
    "solution.c": "c",
    "Solution.cs": "csharp",
    "Solution.kt": "kotlin",
    "Solution.swift": "swift",
}


@dataclass(frozen=True)
class ProblemEntry:
    id: int
    title: str
    difficulty: str
    language: Optional[str]
    path: Path


def _parse_problem_dir_name(name: str) -> Optional[Tuple[int, str]]:
    parts = name.split("-", 1)
    if len(parts) != 2:
        return None
    try:
        pid = int(parts[0])
    except ValueError:
        return None
    title = parts[1].replace("-", " ")
    return pid, title


def _detect_language_from_dir(problem_dir: Path) -> Optional[str]:
    for p in problem_dir.iterdir():
        if p.is_file():
            lang = FILENAME_TO_LANG.get(p.name)
            if lang:
                return lang
    readme = problem_dir / "README.md"
    if readme.exists():
        try:
            for ln in readme.read_text(encoding="utf-8").splitlines():
                if ln.strip().startswith("Language:"):
                    _, _, rest = ln.partition(":")
                    name = rest.strip()
                    if name:
                        return name
        except Exception:
            pass
    return None


def scan_repository(repo_root: Optional[Path] = None) -> Tuple[List[ProblemEntry], Dict[str, int]]:
    """Scan the repository and return (problems, statistics).

    `repo_root` points to the target repository folder (defaults to `LEETCODE_REPO_PATH`).
    """

    if repo_root is None:
        repo_root = Path(LEETCODE_REPO_PATH).expanduser().resolve()

    # Determine whether repo_root itself contains Easy/Medium/Hard or has subfolder
    if (repo_root / "Easy").exists() or (repo_root / "Medium").exists() or (repo_root / "Hard").exists():
        solutions_root = repo_root
    else:
        solutions_root = repo_root / SOLUTIONS_DIR_NAME

    problems: List[ProblemEntry] = []
    stats = {"Total": 0, "Easy": 0, "Medium": 0, "Hard": 0}

    if not solutions_root.exists():
        return problems, stats

    for difficulty in FOLDER_ORDER:
        difficulty_dir = solutions_root / difficulty
        if not difficulty_dir.exists():
            continue

        for child in sorted(difficulty_dir.iterdir()):
            if child.is_file() and child.name != "README.md":
                ext = child.suffix.lower()
                lang = EXT_TO_LANG.get(ext)
                title = child.stem
                problems.append(ProblemEntry(id=0, title=title, difficulty=difficulty, language=lang, path=child))
                stats[difficulty] += 1
                stats["Total"] += 1
            elif child.is_dir():
                parsed = _parse_problem_dir_name(child.name)
                if not parsed:
                    continue
                pid, title = parsed
                lang = _detect_language_from_dir(child)
                problems.append(ProblemEntry(id=pid, title=title, difficulty=difficulty, language=lang, path=child))
                stats[difficulty] += 1
                stats["Total"] += 1

    # Sort deterministically by problem title/id
    problems.sort(key=lambda p: (p.id if p.id > 0 else 99999, p.title))
    return problems, stats
