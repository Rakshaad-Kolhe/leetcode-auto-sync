"""Tests for PR #13 Repository Writer, Routing, Sanitization, and Validation."""

from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

SERVER_DIR = Path(__file__).resolve().parents[1] / "server"
sys.path.insert(0, str(SERVER_DIR))

from git_service import GitService, InvalidRepositoryError  # noqa: E402
from repository_writer import (  # noqa: E402
    get_file_extension,
    sanitize_filename,
    validate_repository,
    write_submission,
)
from schemas import Submission  # noqa: E402


class RepositoryWriterTests(unittest.TestCase):
    """Test repository selection, difficulty routing, sanitization, and language mapping."""

    def test_repository_selection_writes_to_target_and_never_backend(self) -> None:
        """Verify files write exclusively into LEETCODE_REPO_PATH and leave backend untouched."""

        with tempfile.TemporaryDirectory() as target_dir, tempfile.TemporaryDirectory() as backend_dir:
            target_repo = Path(target_dir)
            (target_repo / ".git").mkdir()

            submission = Submission(
                id=1,
                title="Two Sum",
                slug="two-sum",
                difficulty="Easy",
                language="cpp",
                code="class Solution {};",
            )

            res = write_submission(submission, repo_path=target_repo)

            target_file = target_repo / "Easy" / "0001-Two Sum" / "solution.cpp"
            target_readme = target_repo / "Easy" / "0001-Two Sum" / "README.md"
            backend_file = Path(backend_dir) / "0001-Two Sum" / "solution.cpp"

            self.assertTrue(target_file.exists())
            self.assertTrue(target_readme.exists())
            self.assertFalse(backend_file.exists())
            self.assertEqual(res["status"], "created")

    def test_difficulty_routing(self) -> None:
        """Verify Easy -> Easy/, Medium -> Medium/, Hard -> Hard/."""

        with tempfile.TemporaryDirectory() as tmp:
            repo = Path(tmp)
            (repo / ".git").mkdir()

            for diff in ("Easy", "Medium", "Hard"):
                sub = Submission(
                    id=10,
                    title=f"Sample {diff}",
                    slug=f"sample-{diff.lower()}",
                    difficulty=diff,
                    language="python3",
                    code="pass",
                )
                write_submission(sub, repo_path=repo)
                expected_path = repo / diff / f"0010-Sample {diff}" / "solution.py"
                self.assertTrue(expected_path.exists())

    def test_filename_sanitization(self) -> None:
        """Verify invalid filesystem characters are removed and spaces collapsed."""

        dirty_title = '  Problem : Title ? * <With> | Invalid "Chars" \\ And / Slashes  '
        clean = sanitize_filename(dirty_title)
        self.assertEqual(clean, "Problem Title With Invalid Chars And Slashes")

        with tempfile.TemporaryDirectory() as tmp:
            repo = Path(tmp)
            (repo / ".git").mkdir()

            sub = Submission(
                id=42,
                title='What is 2+2 ? : "Math" <Test>',
                slug="math-test",
                difficulty="Hard",
                language="java",
                code="class Solution {}",
            )
            write_submission(sub, repo_path=repo)
            expected_file = repo / "Hard" / "0042-What is 2+2 Math Test" / "solution.java"
            self.assertTrue(expected_file.exists())

    def test_extension_mapping_all_supported_languages(self) -> None:
        """Verify language to extension mapping for all supported languages."""

        mappings = {
            "C++": ".cpp",
            "cpp": ".cpp",
            "Python3": ".py",
            "python": ".py",
            "Java": ".java",
            "JavaScript": ".js",
            "js": ".js",
            "TypeScript": ".ts",
            "ts": ".ts",
            "Go": ".go",
            "golang": ".go",
            "Rust": ".rs",
            "Kotlin": ".kt",
            "C": ".c",
            "C#": ".cs",
            "csharp": ".cs",
            "Swift": ".swift",
            "Ruby": ".rb",
            "PHP": ".php",
            "Dart": ".dart",
            "Scala": ".scala",
            "SQL": ".sql",
        }

        for lang, expected_ext in mappings.items():
            ext = get_file_extension(lang)
            self.assertEqual(ext, expected_ext, f"Failed mapping for language: {lang}")

    def test_unsupported_language_raises_value_error(self) -> None:
        """Verify unsupported language raises ValueError."""

        with self.assertRaises(ValueError):
            get_file_extension("brainfuck")

    def test_invalid_repository_validation(self) -> None:
        """Verify non-git directory or missing .git raises InvalidRepositoryError."""

        with tempfile.TemporaryDirectory() as tmp:
            non_git_repo = Path(tmp) / "not_git"
            non_git_repo.mkdir()

            with self.assertRaises(InvalidRepositoryError) as ctx:
                validate_repository(non_git_repo)

            self.assertIn("Configured repository path is not a valid git repository", str(ctx.exception))


if __name__ == "__main__":
    unittest.main()
