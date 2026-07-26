"""Single Source of Truth version utility for LeetCode Auto Sync."""

from __future__ import annotations

import re
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[1]


def get_version() -> str:
    """Dynamically reads authoritative PEP 621 version from pyproject.toml."""
    pyproject_path = _REPO_ROOT / "pyproject.toml"
    if pyproject_path.exists():
        text = pyproject_path.read_text(encoding="utf-8")
        match = re.search(r'^\s*version\s*=\s*"([^"]+)"', text, re.MULTILINE)
        if match:
            return match.group(1)
    return "1.0.0"


__version__ = get_version()
