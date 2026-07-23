"""Regression tests for deterministic root README generation."""

from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

SERVER_DIR = Path(__file__).resolve().parents[1] / "server"
sys.path.insert(0, str(SERVER_DIR))

from root_readme import generate_readme  # noqa: E402


class RootReadmeGenerationTests(unittest.TestCase):
    """Verify repository scanning, statistics, and markdown output."""

    def test_empty_repository_generates_zero_statistics(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            repo_root = Path(tmp)

            readme_path = generate_readme(repo_root)
            content = readme_path.read_text(encoding="utf-8")

        self.assertIn("| Total Solved | 0 |", content)
        self.assertIn("| Easy | 0 |", content)
        self.assertIn("| Medium | 0 |", content)
        self.assertIn("| Hard | 0 |", content)
        self.assertIn("| # | Problem | Difficulty | Language |", content)

    def test_single_problem_is_indexed_with_language_display_name(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            repo_root = Path(tmp)
            self._write_solution(repo_root, "Easy", "0001-Two-Sum", "solution.cpp")

            content = generate_readme(repo_root).read_text(encoding="utf-8")

        self.assertIn("| Total Solved | 1 |", content)
        self.assertIn("| Easy | 1 |", content)
        self.assertIn("| 1 | Two Sum | Easy | C++ |", content)

    def test_mixed_difficulties_are_sorted_by_problem_number(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            repo_root = Path(tmp)
            self._write_solution(repo_root, "Medium", "0146-LRU-Cache", "Solution.java")
            self._write_solution(repo_root, "Easy", "0001-Two-Sum", "solution.cpp")
            self._write_solution(repo_root, "Medium", "0049-Group-Anagrams", "solution.py")
            self._write_solution(repo_root, "Hard", "0023-Merge-k-Sorted-Lists", "solution.ts")

            content = generate_readme(repo_root).read_text(encoding="utf-8")

        self.assertIn("| Total Solved | 4 |", content)
        self.assertIn("| Easy | 1 |", content)
        self.assertIn("| Medium | 2 |", content)
        self.assertIn("| Hard | 1 |", content)
        index = content.split("## Complete Problem Index", 1)[1]
        self.assertLess(index.index("| 1 | Two Sum | Easy | C++ |"), index.index("| 23 | Merge k Sorted Lists | Hard | TypeScript |"))
        self.assertLess(index.index("| 23 | Merge k Sorted Lists | Hard | TypeScript |"), index.index("| 49 | Group Anagrams | Medium | Python |"))
        self.assertLess(index.index("| 49 | Group Anagrams | Medium | Python |"), index.index("| 146 | LRU Cache | Medium | Java |"))

    def test_multiple_easy_problems_and_languages_are_supported(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            repo_root = Path(tmp)
            self._write_solution(repo_root, "Easy", "0001-Two-Sum", "solution.cpp")
            self._write_solution(repo_root, "Easy", "0009-Palindrome-Number", "solution.go")
            self._write_solution(repo_root, "Easy", "0013-Roman-to-Integer", "Solution.cs")
            self._write_solution(repo_root, "Easy", "0020-Valid-Parentheses", "Solution.swift")

            content = generate_readme(repo_root).read_text(encoding="utf-8")

        self.assertIn("| Easy | 4 |", content)
        self.assertIn("| 9 | Palindrome Number | Easy | Go |", content)
        self.assertIn("| 13 | Roman to Integer | Easy | C# |", content)
        self.assertIn("| 20 | Valid Parentheses | Easy | Swift |", content)

    def test_generation_is_idempotent_after_problem_update(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            repo_root = Path(tmp)
            solution_path = self._write_solution(repo_root, "Medium", "0049-Group-Anagrams", "solution.js")

            first = generate_readme(repo_root).read_text(encoding="utf-8")
            solution_path.write_text("updated code", encoding="utf-8")
            second = generate_readme(repo_root).read_text(encoding="utf-8")
            third = generate_readme(repo_root).read_text(encoding="utf-8")

        self.assertEqual(first, second)
        self.assertEqual(second, third)
        index = second.split("## Complete Problem Index", 1)[1]
        self.assertEqual(index.count("| 49 | Group Anagrams | Medium | JavaScript |"), 1)

    @staticmethod
    def _write_solution(repo_root: Path, difficulty: str, problem_dir: str, filename: str) -> Path:
        solution_path = repo_root / "Leetcode-solutions" / difficulty / problem_dir / filename
        solution_path.parent.mkdir(parents=True, exist_ok=True)
        solution_path.write_text("code", encoding="utf-8")
        return solution_path


if __name__ == "__main__":
    unittest.main()
