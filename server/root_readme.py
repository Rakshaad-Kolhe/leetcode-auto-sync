"""Compatibility wrapper for root README generation."""

from __future__ import annotations

from pathlib import Path

from config import LEETCODE_REPO_PATH
from documentation.index_generator import regenerate_root_readme


def generate_readme(repo_root: Path | None = None) -> Path:
    """Generate the root README.md in `repo_root` or `LEETCODE_REPO_PATH`."""

    root = Path(repo_root or LEETCODE_REPO_PATH).expanduser().resolve()
    if not any((root / difficulty).exists() for difficulty in ("Easy", "Medium", "Hard")):
        nested_root = root / "Leetcode-solutions"
        if nested_root.exists():
            root = nested_root
    return regenerate_root_readme(root)


if __name__ == "__main__":
    print(generate_readme())
