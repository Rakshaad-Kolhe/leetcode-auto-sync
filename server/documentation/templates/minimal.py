"""Minimal documentation template focusing on clean layout and low overhead."""

from __future__ import annotations

from typing import Sequence

from config.config_manager import DocumentationConfig
from ..badges import (
    difficulty_shields_badge,
    language_fence,
    language_shields_badge,
)
from ..markdown import code_fence, markdown_link, unordered_list
from ..models import ProblemMetadata, RepositoryStatistics
from .base import BaseTemplate


class MinimalTemplate(BaseTemplate):
    """Minimalist documentation template with reduced layout elements."""

    def generate_problem_readme(
        self,
        metadata: ProblemMetadata,
        solution: str,
        config: DocumentationConfig,
    ) -> str:
        lines: list[str] = [f"# {metadata.problem_number}. {metadata.title}", ""]

        badges: list[str] = []
        if config.difficulty_badges:
            badges.append(difficulty_shields_badge(metadata.difficulty))
        if config.language_badges:
            badges.append(language_shields_badge(metadata.language))

        if badges:
            lines.append(" ".join(badges))
            lines.append("")

        lines.append(f"[{metadata.title}]({metadata.url})")
        lines.append("")

        if config.show_topics and metadata.topics:
            lines.append(f"**Topics**: {', '.join(metadata.topics)}")
            lines.append("")

        if config.show_companies and metadata.companies:
            lines.append(f"**Companies**: {', '.join(metadata.companies)}")
            lines.append("")

        if config.show_solution:
            lines.append("## Solution")
            lines.append("")
            lines.append(code_fence(solution, language_fence(metadata.language)))
            lines.append("")

        if config.show_timestamp:
            lines.append(f"*Updated: {metadata.generated_at}*")

        return "\n".join(lines).rstrip() + "\n"

    def generate_root_readme(
        self,
        problems: Sequence[ProblemMetadata],
        statistics: RepositoryStatistics,
        config: DocumentationConfig,
    ) -> str:
        lines: list[str] = [
            "# LeetCode Solutions",
            "",
            f"Total Solved: **{statistics.total_solved}** (Easy: {statistics.easy_solved}, Medium: {statistics.medium_solved}, Hard: {statistics.hard_solved})",
            "",
            "## Problems",
            "",
        ]

        sorted_problems = sorted(problems, key=lambda item: item.problem_number)
        items: list[str] = []
        for p in sorted_problems:
            folder = p.folder.as_posix() if p.folder else f"{p.difficulty}/{p.title}"
            items.append(f"#{p.problem_number} {markdown_link(p.title, folder)} ({p.difficulty}, {p.language})")

        lines.append(unordered_list(items) if items else "No solved problems.")

        if config.show_timestamp:
            lines.append("")
            lines.append(f"*Last Updated: {statistics.generated_at}*")

        return "\n".join(lines).rstrip() + "\n"

    def generate_topic_page(
        self,
        topic_name: str,
        problems: Sequence[ProblemMetadata],
        config: DocumentationConfig,
    ) -> str:
        items: list[str] = []
        for problem in sorted(problems, key=lambda p: (p.problem_number, p.title)):
            folder = problem.folder.as_posix() if problem.folder else f"{problem.difficulty}/{problem.title}"
            relative_target = f"../{folder}"
            items.append(markdown_link(problem.title, relative_target))

        problem_list = unordered_list(items) if items else "No solved problems for this topic."
        return f"# {topic_name}\n\n{problem_list}\n"
