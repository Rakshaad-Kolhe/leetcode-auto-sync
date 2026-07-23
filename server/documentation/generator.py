"""High-level markdown generators for problem and repository READMEs and topic pages."""

from __future__ import annotations

from typing import Sequence

from config.config_manager import AppConfig, ConfigManager, DocumentationConfig
from .models import ProblemMetadata, RepositoryStatistics
from .templates import get_template


class DocumentationGenerator:
    """Render documentation from metadata without touching Git."""

    def __init__(self, config: DocumentationConfig | AppConfig | None = None) -> None:
        if isinstance(config, AppConfig):
            self.config = config.documentation
        elif isinstance(config, DocumentationConfig):
            self.config = config
        else:
            self.config = ConfigManager.get_instance().get_config().documentation

    def generate_problem_readme(
        self,
        metadata: ProblemMetadata,
        solution: str,
        config: DocumentationConfig | None = None,
    ) -> str:
        """Render the README for one problem solution folder."""
        cfg = config or self.config
        template = get_template(cfg.template)
        return template.generate_problem_readme(metadata, solution, cfg)

    def generate_repository_readme(
        self,
        problems: Sequence[ProblemMetadata],
        statistics: RepositoryStatistics,
        config: DocumentationConfig | None = None,
    ) -> str:
        """Render the root README for the generated repository."""
        cfg = config or self.config
        template = get_template(cfg.template)
        return template.generate_root_readme(problems, statistics, cfg)

    def generate_topic_page(
        self,
        topic_name: str,
        problems: Sequence[ProblemMetadata],
        config: DocumentationConfig | None = None,
    ) -> str:
        """Render a topic page markdown file for `Topics/<topic_name>.md`."""
        cfg = config or self.config
        template = get_template(cfg.template)
        return template.generate_topic_page(topic_name, problems, cfg)
