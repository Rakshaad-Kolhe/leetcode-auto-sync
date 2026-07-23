"""Base interface for README documentation templates."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Sequence

from config.config_manager import DocumentationConfig
from documentation.models import ProblemMetadata, RepositoryStatistics


class BaseTemplate(ABC):
    """Abstract base class for all documentation templates."""

    @abstractmethod
    def generate_problem_readme(
        self,
        metadata: ProblemMetadata,
        solution: str,
        config: DocumentationConfig,
    ) -> str:
        """Render the README content for an individual problem solution folder."""
        pass

    @abstractmethod
    def generate_root_readme(
        self,
        problems: Sequence[ProblemMetadata],
        statistics: RepositoryStatistics,
        config: DocumentationConfig,
    ) -> str:
        """Render the root README content for the entire repository dashboard."""
        pass

    @abstractmethod
    def generate_topic_page(
        self,
        topic_name: str,
        problems: Sequence[ProblemMetadata],
        config: DocumentationConfig,
    ) -> str:
        """Render markdown content for a topic page under Topics/."""
        pass
