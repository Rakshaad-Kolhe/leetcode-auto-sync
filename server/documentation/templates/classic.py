"""Classic documentation template for problem solution READMEs and repository root."""

from __future__ import annotations

from typing import Sequence

from config.config_manager import DocumentationConfig
from ..badges import (
    difficulty_indicator,
    difficulty_shields_badge,
    language_badge,
    language_fence,
    language_shields_badge,
)
from ..markdown import code_fence, markdown_link, table, unordered_list
from ..models import ProblemMetadata, RepositoryStatistics
from .base import BaseTemplate


class ClassicTemplate(BaseTemplate):
    """Classic template balancing readability, shields badges, and structured sections."""

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
            lines.append("\n\n".join(badges))
            lines.append("")

        lines.append("---")
        lines.append("")
        lines.append("## Problem")
        lines.append("")
        lines.append(metadata.url)
        lines.append("")
        lines.append("---")
        lines.append("")

        sections: list[str] = []
        if config.show_acceptance and metadata.acceptance_rate:
            sections.append(f"## Acceptance Rate\n\n{metadata.acceptance_rate}")

        if config.show_likes and metadata.likes is not None:
            sections.append(f"## Likes\n\n{metadata.likes}")

        if config.show_dislikes and metadata.dislikes is not None:
            sections.append(f"## Dislikes\n\n{metadata.dislikes}")

        if config.show_topics and metadata.topics:
            topic_items = unordered_list(metadata.topics)
            sections.append(f"## Topics\n\n{topic_items}")

        if config.show_companies and metadata.companies:
            company_items = unordered_list(metadata.companies)
            sections.append(f"## Companies\n\n{company_items}")

        if config.show_hints and metadata.hints:
            hint_items = unordered_list(metadata.hints)
            sections.append(f"## Hints\n\n{hint_items}")

        if sections:
            lines.append("\n\n---\n\n".join(sections))
            lines.append("")
            lines.append("---")
            lines.append("")

        if config.show_solution:
            lines.append("## Solution")
            lines.append("")
            lines.append(code_fence(solution, language_fence(metadata.language)))
            lines.append("")
            lines.append("---")
            lines.append("")

        if config.show_timestamp:
            lines.append("Generated automatically by LeetCode Auto Sync.")
            lines.append("")
            lines.append("Last Updated:")
            lines.append(metadata.generated_at)

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
            "---",
            "",
            "## Repository Statistics",
            "",
            self._statistics_table(statistics),
            "",
        ]

        if config.show_timestamp:
            lines.append(f"Last Updated: {statistics.generated_at}")
            lines.append("")

        lines.append(f"Newest Problem: {self._problem_summary(statistics.newest_problem)}")
        lines.append("")
        lines.append(f"Oldest Problem: {self._problem_summary(statistics.oldest_problem)}")
        lines.append("")
        lines.append("---")
        lines.append("")
        lines.append("## Difficulty Distribution")
        lines.append("")
        lines.append(self._difficulty_distribution(statistics))
        lines.append("")
        lines.append("---")
        lines.append("")
        lines.append("## Language Distribution")
        lines.append("")
        lines.append(self._language_distribution(statistics))
        lines.append("")
        lines.append("---")
        lines.append("")

        if config.show_topics and statistics.topic_distribution:
            lines.append("## Topic Distribution")
            lines.append("")
            lines.append(self._topic_distribution(statistics))
            lines.append("")
            lines.append("---")
            lines.append("")

        if config.show_companies and statistics.company_distribution:
            lines.append("## Company Distribution")
            lines.append("")
            lines.append(self._company_distribution(statistics))
            lines.append("")
            lines.append("---")
            lines.append("")

        lines.append("## Recently Solved")
        lines.append("")
        lines.append(self._recently_solved(statistics.latest_solved))
        lines.append("")
        lines.append("---")
        lines.append("")
        lines.append("## Complete Problem Index")
        lines.append("")
        lines.append(self._problem_index(problems))

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
        return (
            f"# {topic_name}\n\n"
            f"Solved: {len(problems)}\n\n"
            f"---\n\n"
            f"## Problems\n\n"
            f"{problem_list}\n"
        )

    def _statistics_table(self, statistics: RepositoryStatistics) -> str:
        headers = ("Metric", "Count")
        rows = [
            ("Total Solved", statistics.total_solved),
            ("Easy", statistics.easy_solved),
            ("Medium", statistics.medium_solved),
            ("Hard", statistics.hard_solved),
        ]
        return table(headers, rows, align_right={1})

    def _difficulty_distribution(self, statistics: RepositoryStatistics) -> str:
        headers = ("Difficulty", "Solved")
        rows = [
            ("🟢 Easy", statistics.easy_solved),
            ("🟠 Medium", statistics.medium_solved),
            ("🔴 Hard", statistics.hard_solved),
        ]
        return table(headers, rows, align_right={1})

    def _language_distribution(self, statistics: RepositoryStatistics) -> str:
        if not statistics.language_distribution:
            return "No solved problems yet."
        rows = [
            (language, count)
            for language, count in sorted(statistics.language_distribution.items(), key=lambda item: (-item[1], item[0]))
        ]
        return table(("Language", "Solved"), rows, align_right={1})

    def _topic_distribution(self, statistics: RepositoryStatistics) -> str:
        if not statistics.topic_distribution:
            return "No topic data available."
        rows = [
            (topic, count)
            for topic, count in sorted(statistics.topic_distribution.items(), key=lambda item: (-item[1], item[0]))
        ]
        return table(("Topic", "Solved"), rows, align_right={1})

    def _company_distribution(self, statistics: RepositoryStatistics) -> str:
        if not statistics.company_distribution:
            return "No company data available."
        rows = [
            (company, count)
            for company, count in sorted(statistics.company_distribution.items(), key=lambda item: (-item[1], item[0]))
        ]
        return table(("Company", "Solved"), rows, align_right={1})

    def _problem_summary(self, problem: ProblemMetadata | None) -> str:
        if problem is None:
            return "N/A"
        return f"{problem.problem_number}. {problem.title}"

    def _recently_solved(self, problems: Sequence[ProblemMetadata]) -> str:
        if not problems:
            return "No solved problems yet."
        rows = [
            (
                problem.problem_number,
                problem.title,
                difficulty_indicator(problem.difficulty),
                language_badge(problem.language),
            )
            for problem in problems[:10]
        ]
        return table(("#", "Problem", "Difficulty", "Language"), rows, align_right={0})

    def _problem_index(self, problems: Sequence[ProblemMetadata]) -> str:
        rows = []
        for problem in sorted(problems, key=lambda item: (item.problem_number, item.title)):
            folder = problem.folder.as_posix() if problem.folder else f"{problem.difficulty}/{problem.title}"
            folder_name = problem.folder.name if problem.folder else problem.title
            rows.append(
                (
                    problem.problem_number,
                    problem.title,
                    difficulty_indicator(problem.difficulty),
                    language_badge(problem.language),
                    markdown_link(folder_name, folder),
                )
            )
        return table(("#", "Problem", "Difficulty", "Language", "Folder"), rows, align_right={0})
