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
    CommitFailedError,
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

    def test_sync_invalid_repository_returns_structured_error(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            result = GitService(Path(tmp)).sync(problem_id=49, title="Group Anagrams", is_new_problem=True)

        self.assertEqual(result["status"], "error")
        self.assertEqual(result["error"]["code"], "invalid_repository")

    def test_sync_missing_git_executable_returns_structured_error(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            repo = self._init_repo(Path(tmp))
            service = GitService(repo, git_executable="definitely-not-git")

            result = service.sync(problem_id=49, title="Group Anagrams", is_new_problem=True)

        self.assertEqual(result["status"], "error")
        self.assertEqual(result["error"]["code"], "git_not_installed")

    def test_sync_detached_head_returns_structured_error(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            repo = self._init_repo(Path(tmp))
            self._commit_file(repo, "README.md", "initial\n", "Initial commit")
            commit = self._git(repo, "rev-parse", "HEAD").stdout.strip()
            self._git(repo, "checkout", commit)

            result = GitService(repo, auto_push=False).sync(
                problem_id=49,
                title="Group Anagrams",
                is_new_problem=True,
            )

        self.assertEqual(result["status"], "error")
        self.assertEqual(result["error"]["code"], "detached_head")

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

    def test_sync_new_problem_commits_without_push_when_disabled(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            repo = self._init_repo(Path(tmp))
            self._commit_file(repo, "README.md", "initial\n", "Initial commit")
            (repo / "solution.py").write_text("print('ok')\n", encoding="utf-8")

            result = GitService(repo, auto_push=False).sync(
                problem_id=1,
                title="Two Sum",
                is_new_problem=True,
            )
            message = self._git(repo, "log", "-1", "--pretty=%s").stdout.strip()
            branch = self._current_branch(repo)

        self.assertEqual(message, "Add 0001 - Two Sum")
        self.assertEqual(result["branch"], branch)
        self.assertTrue(result["commit"])
        self.assertFalse(result["pushed"])

    def test_sync_updated_problem_uses_update_message(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            repo = self._init_repo(Path(tmp))
            self._commit_file(repo, "solution.py", "old\n", "Initial commit")
            (repo / "solution.py").write_text("new\n", encoding="utf-8")

            result = GitService(repo, auto_push=False).sync(
                problem_id=49,
                title="Group Anagrams",
                is_new_problem=False,
            )
            message = self._git(repo, "log", "-1", "--pretty=%s").stdout.strip()

        self.assertEqual(message, "Update 0049 - Group Anagrams")
        self.assertFalse(result["pushed"])

    def test_sync_no_changes_skips_commit_and_push(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            repo = self._init_repo(Path(tmp))
            self._commit_file(repo, "README.md", "initial\n", "Initial commit")
            before = self._git(repo, "rev-parse", "--short", "HEAD").stdout.strip()

            result = GitService(repo, auto_push=True).sync(
                problem_id=1,
                title="Two Sum",
                is_new_problem=True,
            )
            after = self._git(repo, "rev-parse", "--short", "HEAD").stdout.strip()

        self.assertEqual(result, {"status": "no_changes"})
        self.assertEqual(before, after)

    def test_sync_push_enabled_pushes_to_temporary_remote(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            remote = base / "remote.git"
            repo = base / "work"
            self._git(base, "init", "--bare", str(remote))
            self._git(base, "clone", str(remote), str(repo))
            self._configure_identity(repo)
            self._commit_file(repo, "README.md", "initial\n", "Initial commit")
            branch = self._current_branch(repo)
            self._git(repo, "push", "origin", branch)
            (repo / "solution.py").write_text("print('ok')\n", encoding="utf-8")

            result = GitService(repo, auto_push=True).sync(
                problem_id=1,
                title="Two Sum",
                is_new_problem=True,
            )
            remote_head = self._git(remote, "rev-parse", "--short", "HEAD").stdout.strip()

        self.assertTrue(result["pushed"])
        self.assertEqual(result["commit"], remote_head)

    def test_sync_missing_remote_returns_structured_error(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            repo = self._init_repo(Path(tmp))
            self._commit_file(repo, "README.md", "initial\n", "Initial commit")
            (repo / "solution.py").write_text("print('ok')\n", encoding="utf-8")

            result = GitService(repo, auto_push=True).sync(
                problem_id=1,
                title="Two Sum",
                is_new_problem=True,
            )

        self.assertEqual(result["status"], "error")
        self.assertEqual(result["error"]["code"], "missing_remote")

    def test_sync_commit_failure_returns_structured_error(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            repo = self._init_repo(Path(tmp))
            (repo / "solution.py").write_text("print('ok')\n", encoding="utf-8")
            service = GitService(repo, auto_push=False)

            with patch.object(service, "commit_changes", side_effect=CommitFailedError("boom")):
                result = service.sync(problem_id=1, title="Two Sum", is_new_problem=True)

        self.assertEqual(result["status"], "error")
        self.assertEqual(result["error"]["code"], "commit_failed")

    def test_sync_push_failure_returns_structured_error(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            repo = self._init_repo(Path(tmp))
            self._commit_file(repo, "README.md", "initial\n", "Initial commit")
            self._git(repo, "remote", "add", "origin", str(Path(tmp) / "missing.git"))
            (repo / "solution.py").write_text("print('ok')\n", encoding="utf-8")

            result = GitService(repo, auto_push=True).sync(
                problem_id=1,
                title="Two Sum",
                is_new_problem=True,
            )

        self.assertEqual(result["status"], "error")
        self.assertEqual(result["error"]["code"], "push_failed")

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
        self._configure_identity(repo)
        return repo

    def _configure_identity(self, repo: Path) -> None:
        self._git(repo, "config", "user.email", "tests@example.com")
        self._git(repo, "config", "user.name", "Tests")

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

    def _current_branch(self, repo: Path) -> str:
        return self._git(repo, "symbolic-ref", "--quiet", "--short", "HEAD").stdout.strip()


if __name__ == "__main__":
    unittest.main()
