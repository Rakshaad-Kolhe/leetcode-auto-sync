"""High-level markdown generators for problem and repository READMEs and topic pages."""

from __future__ import annotations

from typing import Sequence

from .badges import (
    difficulty_indicator,
    difficulty_shields_badge,
    language_badge,
    language_fence,
    language_shields_badge,
)
from .markdown import code_fence, markdown_link, table, unordered_list
from .models import ProblemMetadata, RepositoryStatistics
from .templates import PROBLEM_README_TEMPLATE, ROOT_README_TEMPLATE, TOPIC_PAGE_TEMPLATE


class DocumentationGenerator:
    """Render documentation from metadata without touching Git."""

    def generate_problem_readme(self, metadata: ProblemMetadata, solution: str) -> str:
        """Render the README for one problem solution folder."""

        sections: list[str] = []

        if metadata.acceptance_rate:
            sections.append(f"## Acceptance Rate\n\n{metadata.acceptance_rate}\n\n---")

        if metadata.likes is not None:
            sections.append(f"## Likes\n\n{metadata.likes}\n\n---")

        if metadata.dislikes is not None:
            sections.append(f"## Dislikes\n\n{metadata.dislikes}\n\n---")

        if metadata.topics:
            topic_items = unordered_list(metadata.topics)
            sections.append(f"## Topics\n\n{topic_items}\n\n---")

        if metadata.companies:
            company_items = unordered_list(metadata.companies)
            sections.append(f"## Companies\n\n{company_items}\n\n---")

        if metadata.hints:
            hint_items = unordered_list(metadata.hints)
            sections.append(f"## Hints\n\n{hint_items}\n\n---")

        sections_block = ("\n\n".join(sections) + "\n\n") if sections else ""

        return PROBLEM_README_TEMPLATE.substitute(
            problem_number=metadata.problem_number,
            title=metadata.title,
            difficulty_badge=difficulty_shields_badge(metadata.difficulty),
            language_badge=language_shields_badge(metadata.language),
            url=metadata.url,
            sections_block=sections_block,
            solution_block=code_fence(solution, language_fence(metadata.language)),
            generated_at=metadata.generated_at,
        ).rstrip() + "\n"

    def generate_repository_readme(
        self,
        problems: Sequence[ProblemMetadata],
        statistics: RepositoryStatistics,
    ) -> str:
        """Render the root README for the generated repository."""

        topic_section = ""
        if statistics.topic_distribution:
            topic_table = self._topic_distribution(statistics)
            topic_section = f"## Topic Distribution\n\n{topic_table}\n\n---\n\n"

        company_section = ""
        if statistics.company_distribution:
            company_table = self._company_distribution(statistics)
            company_section = f"## Company Distribution\n\n{company_table}\n\n---\n\n"

        return ROOT_README_TEMPLATE.substitute(
            statistics_table=self._statistics_table(statistics),
            generated_at=statistics.generated_at,
            newest_problem=self._problem_summary(statistics.newest_problem),
            oldest_problem=self._problem_summary(statistics.oldest_problem),
            difficulty_distribution=self._difficulty_distribution(statistics),
            language_distribution=self._language_distribution(statistics),
            topic_distribution_section=topic_section,
            company_distribution_section=company_section,
            recently_solved=self._recently_solved(statistics.latest_solved),
            problem_index=self._problem_index(problems),
        ).rstrip() + "\n"

    def generate_topic_page(self, topic_name: str, problems: Sequence[ProblemMetadata]) -> str:
        """Render a topic page markdown file for `Topics/<topic_name>.md`."""

        items: list[str] = []
        for problem in sorted(problems, key=lambda p: (p.problem_number, p.title)):
            folder = problem.folder.as_posix() if problem.folder else f"{problem.difficulty}/{problem.title}"
            relative_target = f"../{folder}"
            items.append(markdown_link(problem.title, relative_target))

        problem_list = unordered_list(items) if items else "No solved problems for this topic."

        return TOPIC_PAGE_TEMPLATE.substitute(
            topic_name=topic_name,
            count=len(problems),
            problem_list=problem_list,
        ).rstrip() + "\n"

    def _statistics_table(self, statistics: RepositoryStatistics) -> str:
        return table(
            ("Metric", "Count"),
            (
                ("Total Solved", statistics.total_solved),
                ("Easy", statistics.easy_solved),
                ("Medium", statistics.medium_solved),
                ("Hard", statistics.hard_solved),
            ),
            align_right={1},
        )

    def _difficulty_distribution(self, statistics: RepositoryStatistics) -> str:
        return table(
            ("Difficulty", "Solved"),
            (
                ("🟢 Easy", statistics.easy_solved),
                ("🟠 Medium", statistics.medium_solved),
                ("🔴 Hard", statistics.hard_solved),
            ),
            align_right={1},
        )

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

    def _problem_summary(self, problem: ProblemMetadata | None) -> str:
        if problem is None:
            return "N/A"
        return f"{problem.problem_number}. {problem.title}"
