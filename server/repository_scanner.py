"""Scan the Leetcode-solutions repository to discover problems and statistics.

This module inspects the filesystem under the configured `LEETCODE_REPO_PATH`
and returns a deterministic list of problems and basic difficulty statistics.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from config import LEETCODE_REPO_PATH


FOLDER_ORDER = ("Easy", "Medium", "Hard")
SOLUTIONS_DIR_NAME = "Leetcode-solutions"

# Map known solution filenames back to language keys
FILENAME_TO_LANG: Dict[str, str] = {
    "solution.cpp": "cpp",
    "solution.py": "python",
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
    """Parse directory name like `0001-Two-Sum` into (id, title).

    Returns None if the directory name doesn't match expected pattern.
    """

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
    """Detect language by looking for a known solution filename in `problem_dir`.

    Returns the language key (e.g. 'cpp', 'python') or None when unknown.
    """

    for p in problem_dir.iterdir():
        if p.is_file():
            lang = FILENAME_TO_LANG.get(p.name)
            if lang:
                return lang
    # If no known solution file found, try reading README.md 'Language:' line
    readme = problem_dir / "README.md"
    if readme.exists():
        try:
            for ln in readme.read_text(encoding="utf-8").splitlines():
                if ln.strip().startswith("Language:"):
                    _, _, rest = ln.partition(":")
                    name = rest.strip()
                    # Normalize some common variants
                    if not name:
                        continue
                    return name
        except Exception:
            pass
    return None


def scan_repository(repo_root: Optional[Path] = None) -> Tuple[List[ProblemEntry], Dict[str, int]]:
    """Scan the repository and return (problems, statistics).

    - `repo_root` points to the folder that contains `Leetcode-solutions`.
      When omitted the `LEETCODE_REPO_PATH` from config is used.
    - Returns a tuple: (sorted problems list, stats dict)
    """

    if repo_root is None:
        repo_root = Path(LEETCODE_REPO_PATH)

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
            if not child.is_dir():
                continue
            parsed = _parse_problem_dir_name(child.name)
            if not parsed:
                continue
            pid, title = parsed
            lang = _detect_language_from_dir(child)
            problems.append(ProblemEntry(id=pid, title=title, difficulty=difficulty, language=lang, path=child))
            stats[difficulty] += 1
            stats["Total"] += 1

    # Sort deterministically by problem id ascending
    problems.sort(key=lambda p: p.id)
    return problems, stats
