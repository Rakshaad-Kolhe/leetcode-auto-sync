"""Folder layout strategies for generating problem submission directory paths."""

from __future__ import annotations

import re
from abc import ABC, abstractmethod
from pathlib import Path


def sanitize_filename(title: str) -> str:
    """Return a filesystem-friendly version of problem title.

    Removes invalid characters (: ? * < > | " \\ /) and collapses repeated spaces.
    """
    cleaned = re.sub(r'[:?\*<>\|"\\/]', "", title)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


class FolderLayoutStrategy(ABC):
    """Abstract base class for problem folder layout strategies."""

    @abstractmethod
    def get_relative_folder_path(
        self,
        problem_number: int,
        title: str,
        difficulty: str,
        language: str | None = None,
    ) -> Path:
        """Return the relative directory Path for a problem submission."""
        pass


class DifficultyNumberTitleLayout(FolderLayoutStrategy):
    """Option 1: Difficulty/0001-Title (e.g., Medium/3513-Number of Unique XOR Triplets I)"""

    def get_relative_folder_path(
        self,
        problem_number: int,
        title: str,
        difficulty: str,
        language: str | None = None,
    ) -> Path:
        sanitized = sanitize_filename(title)
        return Path(difficulty) / f"{problem_number:04d}-{sanitized}"


class NumberTitleLayout(FolderLayoutStrategy):
    """Option 2a: 0001-Title (e.g., 3513-Number of Unique XOR Triplets I)"""

    def get_relative_folder_path(
        self,
        problem_number: int,
        title: str,
        difficulty: str,
        language: str | None = None,
    ) -> Path:
        sanitized = sanitize_filename(title)
        return Path(f"{problem_number:04d}-{sanitized}")


class NumberLayout(FolderLayoutStrategy):
    """Option 2b: 3513 or 0001 (e.g., 3513/)"""

    def get_relative_folder_path(
        self,
        problem_number: int,
        title: str,
        difficulty: str,
        language: str | None = None,
    ) -> Path:
        return Path(f"{problem_number:04d}")


class DifficultyTitleLayout(FolderLayoutStrategy):
    """Option 3: Difficulty/Title (e.g., Medium/Number of Unique XOR Triplets I)"""

    def get_relative_folder_path(
        self,
        problem_number: int,
        title: str,
        difficulty: str,
        language: str | None = None,
    ) -> Path:
        sanitized = sanitize_filename(title)
        return Path(difficulty) / sanitized


class DifficultyNumberLayout(FolderLayoutStrategy):
    """Option 4: Difficulty/3513 (e.g., Medium/3513)"""

    def get_relative_folder_path(
        self,
        problem_number: int,
        title: str,
        difficulty: str,
        language: str | None = None,
    ) -> Path:
        return Path(difficulty) / f"{problem_number:04d}"


LAYOUT_STRATEGIES: dict[str, type[FolderLayoutStrategy]] = {
    "difficulty-number-title": DifficultyNumberTitleLayout,
    "number-title": NumberTitleLayout,
    "number": NumberLayout,
    "difficulty-title": DifficultyTitleLayout,
    "difficulty-number": DifficultyNumberLayout,
}


def get_folder_layout_strategy(layout_name: str) -> FolderLayoutStrategy:
    """Return an instance of FolderLayoutStrategy matching `layout_name`.

    Falls back to `DifficultyNumberTitleLayout` if strategy name is unrecognised.
    """
    normalised = (layout_name or "").strip().lower()
    strategy_cls = LAYOUT_STRATEGIES.get(normalised, DifficultyNumberTitleLayout)
    return strategy_cls()
