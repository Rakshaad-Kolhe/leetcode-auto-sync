"""Unit tests for README templates and documentation configuration section/badge toggles."""

from __future__ import annotations

import unittest
from pathlib import Path
import sys

SERVER_DIR = Path(__file__).resolve().parents[1] / "server"
if str(SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(SERVER_DIR))

from config.config_manager import DocumentationConfig
from documentation.generator import DocumentationGenerator
from documentation.models import ProblemMetadata, RepositoryStatistics
from documentation.templates import (
    ClassicTemplate,
    DetailedTemplate,
    MinimalTemplate,
    get_template,
)


class TemplateSystemTests(unittest.TestCase):
    def setUp(self) -> None:
        self.metadata = ProblemMetadata(
            problem_number=1,
            title="Two Sum",
            slug="two-sum",
            difficulty="Easy",
            language="python3",
            url="https://leetcode.com/problems/two-sum/",
            generated_at="2026-07-23T10:00:00Z",
            folder=Path("Easy/0001-Two Sum"),
            topics=["Array", "Hash Table"],
            companies=["Google", "Amazon"],
            acceptance_rate="52.4%",
            likes=50000,
            dislikes=1500,
            hints=["Use hash table to store complement"],
        )
        self.solution = "class Solution:\n    def twoSum(self, nums, target):\n        pass"

    def test_get_template_factory(self) -> None:
        self.assertIsInstance(get_template("classic"), ClassicTemplate)
        self.assertIsInstance(get_template("minimal"), MinimalTemplate)
        self.assertIsInstance(get_template("detailed"), DetailedTemplate)
        self.assertIsInstance(get_template("unknown"), ClassicTemplate)

    def test_classic_template_rendering(self) -> None:
        config = DocumentationConfig(template="classic")
        generator = DocumentationGenerator(config)
        content = generator.generate_problem_readme(self.metadata, self.solution)

        self.assertIn("# 1. Two Sum", content)
        self.assertIn("![Difficulty](https://img.shields.io/badge/Difficulty-Easy-brightgreen)", content)
        self.assertIn("![Language](https://img.shields.io/badge/Language-Python-blue)", content)
        self.assertIn("## Acceptance Rate\n\n52.4%", content)
        self.assertIn("## Likes\n\n50000", content)
        self.assertIn("## Dislikes\n\n1500", content)
        self.assertIn("## Topics\n\n- Array\n- Hash Table", content)
        self.assertIn("## Companies\n\n- Google\n- Amazon", content)
        self.assertIn("## Hints\n\n- Use hash table to store complement", content)
        self.assertIn("```python\nclass Solution:", content)
        self.assertIn("2026-07-23T10:00:00Z", content)

    def test_minimal_template_rendering(self) -> None:
        config = DocumentationConfig(template="minimal")
        generator = DocumentationGenerator(config)
        content = generator.generate_problem_readme(self.metadata, self.solution)

        self.assertIn("# 1. Two Sum", content)
        self.assertIn("[Two Sum](https://leetcode.com/problems/two-sum/)", content)
        self.assertIn("**Topics**: Array, Hash Table", content)
        self.assertIn("```python", content)

    def test_detailed_template_rendering(self) -> None:
        config = DocumentationConfig(template="detailed")
        generator = DocumentationGenerator(config)
        content = generator.generate_problem_readme(self.metadata, self.solution)

        self.assertIn("# Problem 1: Two Sum", content)
        self.assertIn("## Metadata Summary", content)
        self.assertIn("| Acceptance Rate | 52.4% |", content)
        self.assertIn("| Likes | 50000 |", content)
        self.assertIn("## Hints & Strategy", content)

    def test_disabled_badges(self) -> None:
        config = DocumentationConfig(
            template="classic",
            difficulty_badges=False,
            language_badges=False,
        )
        generator = DocumentationGenerator(config)
        content = generator.generate_problem_readme(self.metadata, self.solution)

        self.assertNotIn("https://img.shields.io/badge/Difficulty-", content)
        self.assertNotIn("https://img.shields.io/badge/Language-", content)

    def test_disabled_sections(self) -> None:
        config = DocumentationConfig(
            template="classic",
            show_acceptance=False,
            show_likes=False,
            show_dislikes=False,
            show_topics=False,
            show_companies=False,
            show_hints=False,
            show_timestamp=False,
            show_solution=False,
        )
        generator = DocumentationGenerator(config)
        content = generator.generate_problem_readme(self.metadata, self.solution)

        self.assertNotIn("## Acceptance Rate", content)
        self.assertNotIn("## Likes", content)
        self.assertNotIn("## Dislikes", content)
        self.assertNotIn("## Topics", content)
        self.assertNotIn("## Companies", content)
        self.assertNotIn("## Hints", content)
        self.assertNotIn("## Solution", content)
        self.assertNotIn("Last Updated:", content)


if __name__ == "__main__":
    unittest.main()
