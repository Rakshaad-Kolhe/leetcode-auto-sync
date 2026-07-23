"""Data models for LeetCode metadata enrichment."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass(frozen=True)
class TopicTag:
    """Topic categorization tag for a LeetCode problem."""

    name: str
    slug: str


@dataclass(frozen=True)
class CompanyTag:
    """Company tag for a LeetCode problem."""

    name: str
    slug: str


@dataclass(frozen=True)
class RelatedProblem:
    """A similar or related LeetCode problem."""

    title: str
    title_slug: str
    difficulty: str


@dataclass(frozen=True)
class EnrichedMetadata:
    """Authoritative enriched metadata retrieved from GraphQL or cache."""

    problem_number: int
    title: str
    slug: str
    difficulty: str
    acceptance_rate: Optional[str] = None
    likes: Optional[int] = None
    dislikes: Optional[int] = None
    topics: List[TopicTag] = field(default_factory=list)
    companies: List[CompanyTag] = field(default_factory=list)
    hints: List[str] = field(default_factory=list)
    similar_questions: List[RelatedProblem] = field(default_factory=list)
    raw: Dict[str, Any] = field(default_factory=dict)

    def topic_names(self) -> List[str]:
        """Return a list of topic display names."""

        return [t.name for t in self.topics]

    def company_names(self) -> List[str]:
        """Return a list of company display names."""

        return [c.name for c in self.companies]
