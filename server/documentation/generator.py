"""High-level markdown generators for problem and repository READMEs."""

from __future__ import annotations

from typing import Sequence

from .badges import difficulty_badge, language_badge, language_fence
from .markdown import code_fence, table
from .models import ProblemMetadata, RepositoryStatistics
from .templates import PROBLEM_README_TEMPLATE, ROOT_README_TEMPLATE


class DocumentationGenerator:
    """Render documentation from metadata without touching Git."""

    def generate_problem_readme(self, metadata: ProblemMetadata, solution: str) -> str:
        """Render the README for one problem solution folder."""

        return PROBLEM_README_TEMPLATE.substitute(
            problem_number=metadata.problem_number,
            title=metadata.title,
            difficulty=difficulty_badge(metadata.difficulty),
            url=metadata.url,
            language=language_badge(metadata.language),
            solution_block=code_fence(solution, language_fence(metadata.language)),
            generated_at=metadata.generated_at,
        ).rstrip() + "\n"

    def generate_repository_readme(
        self,
        problems: Sequence[ProblemMetadata],
        statistics: RepositoryStatistics,
    ) -> str:
        """Render the root README for the generated repository."""

        return ROOT_README_TEMPLATE.substitute(
            statistics_table=self._statistics_table(statistics),
            generated_at=statistics.generated_at,
            language_distribution=self._language_distribution(statistics),
            recently_solved=self._recently_solved(statistics.latest_solved),
            problem_index=self._problem_index(problems),
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

    def _language_distribution(self, statistics: RepositoryStatistics) -> str:
        if not statistics.language_distribution:
            return "No solved problems yet."

        rows = [
            (language, count)
            for language, count in sorted(statistics.language_distribution.items(), key=lambda item: item[0])
        ]
        return table(("Language", "Solved"), rows, align_right={1})

    def _recently_solved(self, problems: Sequence[ProblemMetadata]) -> str:
        if not problems:
            return "No solved problems yet."

        rows = [
            (
                problem.problem_number,
                problem.title,
                problem.difficulty,
                language_badge(problem.language),
            )
            for problem in problems[:10]
        ]
        return table(("#", "Problem", "Difficulty", "Language"), rows, align_right={0})

    def _problem_index(self, problems: Sequence[ProblemMetadata]) -> str:
        rows = []
        for problem in sorted(problems, key=lambda item: (item.problem_number, item.title)):
            folder = problem.folder.as_posix() if problem.folder else f"{problem.difficulty}/{problem.title}"
            rows.append(
                (
                    problem.problem_number,
                    problem.title,
                    problem.difficulty,
                    language_badge(problem.language),
                    folder,
                )
            )
        return table(("#", "Problem", "Difficulty", "Language", "Folder"), rows, align_right={0})
