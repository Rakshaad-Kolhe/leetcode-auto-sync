"""Tests for the reusable Git service foundation."""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

SERVER_DIR = Path(__file__).resolve().parents[1] / "server"
sys.path.insert(0, str(SERVER_DIR))

from git_service import (  # noqa: E402
    DetachedHeadError,
    GitNotInstalledError,
    GitService,
    InvalidRepositoryError,
    MissingRemoteError,
    generate_problem_commit_message,
)


@unittest.skipIf(shutil.which("git") is None, "Git executable is required for Git service tests.")
class GitServiceTests(unittest.TestCase):
    """Exercise GitService against isolated temporary repositories."""

    def test_valid_repository(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            repo = self._init_repo(Path(tmp))

            result = GitService(repo).verify_repository()

        self.assertEqual(result["valid"], True)

    def test_invalid_repository(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            service = GitService(Path(tmp))

            with self.assertRaises(InvalidRepositoryError):
                service.verify_repository()

    def test_no_git_installed_mock(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            service = GitService(Path(tmp))

            with patch("git_service.shutil.which", return_value=None):
                with self.assertRaises(GitNotInstalledError):
                    service.verify_repository()

    def test_detached_head_mock(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            repo = self._init_repo(Path(tmp))
            service = GitService(repo)

            with patch.object(service, "_run", side_effect=DetachedHeadError("detached")):
                with self.assertRaises(DetachedHeadError):
                    service.get_current_branch()

    def test_missing_remote(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            repo = self._init_repo(Path(tmp))
            self._commit_file(repo, "README.md", "initial\n", "Initial commit")

            with self.assertRaises(MissingRemoteError):
                GitService(repo).push_changes()

    def test_empty_repository(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            repo = self._init_repo(Path(tmp))
            service = GitService(repo)

            branch = service.get_current_branch()
            status = service.get_status()

        self.assertTrue(branch["branch"])
        self.assertEqual(status, {"clean": True, "files": []})

    def test_clean_repository(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            repo = self._init_repo(Path(tmp))
            self._commit_file(repo, "README.md", "initial\n", "Initial commit")

            status = GitService(repo).get_status()

        self.assertTrue(status["clean"])
        self.assertEqual(status["files"], [])

    def test_dirty_repository(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            repo = self._init_repo(Path(tmp))
            self._commit_file(repo, "README.md", "initial\n", "Initial commit")
            (repo / "solution.py").write_text("print('ok')\n", encoding="utf-8")

            status = GitService(repo).get_status()

        self.assertFalse(status["clean"])
        self.assertEqual(status["files"], [{"status": "??", "path": "solution.py"}])

    def test_stage_changes(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            repo = self._init_repo(Path(tmp))
            (repo / "solution.py").write_text("print('ok')\n", encoding="utf-8")

            result = GitService(repo).stage_changes()

        self.assertEqual(result, {"staged": True, "files": ["solution.py"]})

    def test_commit_changes(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            repo = self._init_repo(Path(tmp))
            (repo / "solution.py").write_text("print('ok')\n", encoding="utf-8")
            service = GitService(repo)
            service.stage_changes()

            result = service.commit_changes("Add 0001 - Two Sum")

        self.assertTrue(result["committed"])
        self.assertEqual(result["message"], "Add 0001 - Two Sum")
        self.assertTrue(result["commit"])

    def test_commit_message_generation(self) -> None:
        self.assertEqual(
            generate_problem_commit_message(49, "Group Anagrams", is_new_problem=True),
            "Add 0049 - Group Anagrams",
        )
        self.assertEqual(
            generate_problem_commit_message(49, "Group Anagrams", is_new_problem=False),
            "Update 0049 - Group Anagrams",
        )

    def _init_repo(self, repo: Path) -> Path:
        repo.mkdir(parents=True, exist_ok=True)
        self._git(repo, "init")
        self._git(repo, "config", "user.email", "tests@example.com")
        self._git(repo, "config", "user.name", "Tests")
        return repo

    def _commit_file(self, repo: Path, relative_path: str, content: str, message: str) -> None:
        path = repo / relative_path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        self._git(repo, "add", ".")
        self._git(repo, "commit", "-m", message)

    def _git(self, cwd: Path, *args: str) -> subprocess.CompletedProcess[str]:
        env = os.environ.copy()
        env["GIT_TERMINAL_PROMPT"] = "0"
        return subprocess.run(
            ["git", *args],
            cwd=cwd,
            text=True,
            capture_output=True,
            check=True,
            env=env,
        )


if __name__ == "__main__":
    unittest.main()
