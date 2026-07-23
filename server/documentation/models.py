"""Data models for repository documentation generation."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional


@dataclass(frozen=True)
class ProblemMetadata:
    """Metadata required to render and index a LeetCode problem."""

    problem_number: int
    title: str
    slug: str
    difficulty: str
    language: str
    url: str
    generated_at: str
    folder: Optional[Path] = None
    topics: List[str] = field(default_factory=list)
    acceptance_rate: Optional[str] = None
    likes: Optional[int] = None
    dislikes: Optional[int] = None
    extra: Dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class RepositoryStatistics:
    """Computed statistics for a generated solutions repository."""

    total_solved: int
    easy_solved: int
    medium_solved: int
    hard_solved: int
    language_distribution: Dict[str, int]
    latest_solved: List[ProblemMetadata]
    newest_problem: Optional[ProblemMetadata]
    oldest_problem: Optional[ProblemMetadata]
    generated_at: str
