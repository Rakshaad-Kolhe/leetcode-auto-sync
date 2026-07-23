"""Regenerate the root README for a generated LeetCode repository."""

from __future__ import annotations

import os
import tempfile
from pathlib import Path

from config import LEETCODE_REPO_PATH

from .generator import DocumentationGenerator
from .statistics import generate_statistics, scan_repository


def regenerate_root_readme(repo_root: Path | str | None = None) -> Path:
    """Write a fresh root README.md from current repository contents."""

    root = Path(repo_root or LEETCODE_REPO_PATH).expanduser().resolve()
    problems = scan_repository(root)
    statistics = generate_statistics(problems)
    readme = DocumentationGenerator().generate_repository_readme(problems, statistics)
    readme_path = root / "README.md"
    _atomic_write(readme_path, readme)
    return readme_path


def _atomic_write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_path = tempfile.mkstemp(dir=str(path.parent))
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            handle.write(content)
        os.replace(tmp_path, path)
    finally:
        tmp = Path(tmp_path)
        if tmp.exists():
            tmp.unlink()
