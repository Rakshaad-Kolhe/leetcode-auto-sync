"""Regenerate the root README and topic pages for a generated LeetCode repository."""

from __future__ import annotations

import logging
import os
import tempfile
from pathlib import Path
from typing import Dict, List

from config import LEETCODE_REPO_PATH

from .generator import DocumentationGenerator
from .models import ProblemMetadata
from .statistics import generate_statistics, scan_repository

logger = logging.getLogger(__name__)


def regenerate_root_readme(repo_root: Path | str | None = None) -> Path:
    """Write a fresh root README.md and topic pages from current repository contents."""

    root = Path(repo_root or LEETCODE_REPO_PATH).expanduser().resolve()
    problems = scan_repository(root)
    statistics = generate_statistics(problems)
    generator = DocumentationGenerator()

    # 1. Regenerate root README.md
    readme = generator.generate_repository_readme(problems, statistics)
    readme_path = root / "README.md"
    _atomic_write(readme_path, readme)

    # 2. Regenerate Topics/*.md pages
    _regenerate_topic_pages(root, problems, generator)

    return readme_path


def _regenerate_topic_pages(
    root: Path,
    problems: List[ProblemMetadata],
    generator: DocumentationGenerator,
) -> None:
    """Generate topic-specific markdown files under `<root>/Topics/`."""

    topics_dir = root / "Topics"
    topics_dir.mkdir(parents=True, exist_ok=True)

    topics_map: Dict[str, List[ProblemMetadata]] = {}
    for problem in problems:
        for topic in problem.topics:
            topics_map.setdefault(topic, []).append(problem)

    # Write each topic page
    written_files = set()
    for topic_name, topic_problems in topics_map.items():
        topic_content = generator.generate_topic_page(topic_name, topic_problems)
        file_path = topics_dir / f"{topic_name}.md"
        _atomic_write(file_path, topic_content)
        written_files.add(file_path.resolve())

    # Remove stale topic files if any exist
    try:
        for existing in topics_dir.glob("*.md"):
            if existing.resolve() not in written_files:
                existing.unlink()
    except Exception as exc:
        logger.warning(f"Error cleaning up stale topic files: {exc}")


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
