"""Unit tests for the documentation engine."""

from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

SERVER_DIR = Path(__file__).resolve().parents[1] / "server"
sys.path.insert(0, str(SERVER_DIR))

from documentation.generator import DocumentationGenerator  # noqa: E402
from documentation.index_generator import regenerate_root_readme  # noqa: E402
from documentation.markdown import code_fence, heading, horizontal_rule, table, unordered_list  # noqa: E402
from documentation.models import ProblemMetadata  # noqa: E402
from documentation.statistics import generate_statistics, scan_repository  # noqa: E402
from repository_writer import write_submission  # noqa: E402
from schemas import Submission  # noqa: E402


class DocumentationEngineTests(unittest.TestCase):
    """Exercise README rendering, repository statistics, and regeneration."""

    def test_problem_readme_generation_uses_template(self) -> None:
        metadata = self._metadata()
        content = DocumentationGenerator().generate_problem_readme(metadata, "class Solution {};")

        self.assertIn("# 1260. Shift 2D Grid", content)
        self.assertIn("![Difficulty](https://img.shields.io/badge/Difficulty-Medium-orange)", content)
        self.assertIn("![Language](https://img.shields.io/badge/Language-C%2B%2B-blue)", content)
        self.assertIn("https://leetcode.com/problems/shift-2d-grid/", content)
        self.assertIn("```cpp\nclass Solution {};\n```", content)
        self.assertIn("Last Updated:\n2026-07-23T10:00:00Z", content)

    def test_rich_problem_readme_rendering_with_optional_sections(self) -> None:
        metadata = self._metadata(
            topics=["Array", "Matrix"],
            companies=["Google", "Amazon"],
            acceptance_rate="63.4%",
            likes=421,
            dislikes=18,
            hints=["Hint 1"],
        )
        content = DocumentationGenerator().generate_problem_readme(metadata, "code")

        self.assertIn("## Acceptance Rate\n\n63.4%", content)
        self.assertIn("## Likes\n\n421", content)
        self.assertIn("## Dislikes\n\n18", content)
        self.assertIn("## Topics\n\n- Array\n- Matrix", content)
        self.assertIn("## Companies\n\n- Google\n- Amazon", content)
        self.assertIn("## Hints\n\n- Hint 1", content)

    def test_repository_readme_generation_contains_statistics_and_sorted_index(self) -> None:
        generator = DocumentationGenerator()
        problems = [
            self._metadata(problem_number=1260, title="Shift 2D Grid", difficulty="Medium", topics=["Array"]),
            self._metadata(problem_number=1, title="Two Sum", slug="two-sum", difficulty="Easy", topics=["Array", "Hash Table"]),
        ]
        stats = generate_statistics(problems)
        content = generator.generate_repository_readme(problems, stats)

        self.assertIn("## Repository Statistics", content)
        self.assertIn("| Total Solved | 2 |", content)
        self.assertIn("## Language Distribution", content)
        self.assertIn("| C++ | 2 |", content)
        self.assertIn("## Topic Distribution", content)
        self.assertIn("| Array | 2 |", content)
        self.assertIn("| Hash Table | 1 |", content)
        self.assertLess(content.index("| 1 | Two Sum | 🟢 Easy | C++ |"), content.index("| 1260 | Shift 2D Grid | 🟠 Medium | C++ |"))

    def test_markdown_helpers_render_common_blocks(self) -> None:
        self.assertEqual(heading(2, "Problem"), "## Problem")
        self.assertEqual(horizontal_rule(), "---")
        self.assertEqual(code_fence("print('ok')", "python"), "```python\nprint('ok')\n```")
        self.assertEqual(unordered_list(["A", "B"]), "- A\n- B")
        self.assertEqual(table(("A", "B"), (("x|y", 2),), align_right={1}), "| A | B |\n| --- | ---: |\n| x\\|y | 2 |")

    def test_statistics_generation_counts_difficulty_language_and_topics(self) -> None:
        problems = [
            self._metadata(problem_number=1, title="Two Sum", difficulty="Easy", topics=["Array", "Hash Table"], generated_at="2026-07-20T00:00:00Z"),
            self._metadata(problem_number=49, title="Group Anagrams", difficulty="Medium", language="python3", topics=["Hash Table", "String"], generated_at="2026-07-22T00:00:00Z"),
            self._metadata(problem_number=23, title="Merge k Sorted Lists", difficulty="Hard", topics=["Heap"], generated_at="2026-07-21T00:00:00Z"),
        ]

        stats = generate_statistics(problems)

        self.assertEqual(stats.total_solved, 3)
        self.assertEqual(stats.easy_solved, 1)
        self.assertEqual(stats.medium_solved, 1)
        self.assertEqual(stats.hard_solved, 1)
        self.assertEqual(stats.language_distribution, {"C++": 2, "Python": 1})
        self.assertEqual(stats.topic_distribution["Hash Table"], 2)
        self.assertEqual(stats.topic_distribution["Array"], 1)
        self.assertEqual([problem.problem_number for problem in stats.latest_solved], [49, 23, 1])

    def test_repository_regeneration_scans_solution_folders(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            repo = Path(tmp)
            (repo / ".git").mkdir()
            write_submission(
                Submission(
                    id=1260,
                    title="Shift 2D Grid",
                    slug="shift-2d-grid",
                    difficulty="Medium",
                    language="cpp",
                    code="class Solution {};",
                ),
                repo_path=repo,
            )

            readme_path = regenerate_root_readme(repo)
            content = readme_path.read_text(encoding="utf-8")
            scanned = scan_repository(repo)

        self.assertEqual(scanned[0].problem_number, 1260)
        self.assertIn("| 1260 | Shift 2D Grid | 🟠 Medium | C++ | [1260-Shift 2D Grid](Medium/1260-Shift%202D%20Grid) |", content)

    def _metadata(
        self,
        *,
        problem_number: int = 1260,
        title: str = "Shift 2D Grid",
        slug: str = "shift-2d-grid",
        difficulty: str = "Medium",
        language: str = "cpp",
        generated_at: str = "2026-07-23T10:00:00Z",
        topics: list[str] | None = None,
        companies: list[str] | None = None,
        acceptance_rate: str | None = None,
        likes: int | None = None,
        dislikes: int | None = None,
        hints: list[str] | None = None,
    ) -> ProblemMetadata:
        folder_name = f"{problem_number:04d}-{title}"
        return ProblemMetadata(
            problem_number=problem_number,
            title=title,
            slug=slug,
            difficulty=difficulty,
            language=language,
            url=f"https://leetcode.com/problems/{slug}/",
            generated_at=generated_at,
            folder=Path(difficulty) / folder_name,
            topics=topics or [],
            companies=companies or [],
            acceptance_rate=acceptance_rate,
            likes=likes,
            dislikes=dislikes,
            hints=hints or [],
        )


if __name__ == "__main__":
    unittest.main()
