"""Compatibility scanner for generated LeetCode repositories."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from config import LEETCODE_REPO_PATH
from documentation.statistics import DIFFICULTY_FOLDERS, scan_repository as scan_documented_repository

FOLDER_ORDER = DIFFICULTY_FOLDERS
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

@dataclass(frozen=True)
class ProblemEntry:
    id: int
    title: str
    difficulty: str
    language: Optional[str]
    path: Path

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

    documented = scan_documented_repository(solutions_root)
    problems = [
        ProblemEntry(
            id=problem.problem_number,
            title=problem.title,
            difficulty=problem.difficulty,
            language=problem.language,
            path=solutions_root / problem.folder if problem.folder else solutions_root,
        )
        for problem in documented
    ]
    stats = {"Total": 0, "Easy": 0, "Medium": 0, "Hard": 0}
    for problem in problems:
        stats[problem.difficulty] += 1
        stats["Total"] += 1
    return problems, stats
