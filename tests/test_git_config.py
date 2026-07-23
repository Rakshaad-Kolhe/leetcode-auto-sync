"""Unit tests for Git configuration, commit message formatting, and synchronization behavior."""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
import sys

SERVER_DIR = Path(__file__).resolve().parents[1] / "server"
if str(SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(SERVER_DIR))

from config.config_manager import GitConfig
from git_service import GitService, generate_problem_commit_message


class GitConfigTests(unittest.TestCase):
    def test_custom_commit_message_formatting(self) -> None:
        msg1 = generate_problem_commit_message(
            1, "Two Sum", is_new_problem=True, template="Add {problem_number} - {problem_title}"
        )
        self.assertEqual(msg1, "Add 0001 - Two Sum")

        msg2 = generate_problem_commit_message(
            1, "Two Sum", is_new_problem=False, template="Update {problem_number} - {problem_title}"
        )
        self.assertEqual(msg2, "Update 0001 - Two Sum")

        msg3 = generate_problem_commit_message(
            3513, "XOR Triplets", is_new_problem=True, template="Solve {problem_number}: {problem_title}"
        )
        self.assertEqual(msg3, "Solve 3513: XOR Triplets")

        msg4 = generate_problem_commit_message(
            42, "Trapping Rain Water", is_new_problem=True, template="{action} [{difficulty}] {problem_number} ({language})"
        )
        self.assertIn("Add [] 0042 ()", msg4)

    def test_git_service_config_initialization(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            repo_root = Path(tmp)
            (repo_root / ".git").mkdir()

            git_cfg = GitConfig(
                auto_commit=False,
                auto_push=False,
                commit_message="LeetCode Sync {problem_number}",
            )
            service = GitService(repo_path=repo_root, config=git_cfg)

            self.assertFalse(service.auto_commit)
            self.assertFalse(service.auto_push)
            self.assertEqual(service.commit_message_template, "LeetCode Sync {problem_number}")


if __name__ == "__main__":
    unittest.main()
