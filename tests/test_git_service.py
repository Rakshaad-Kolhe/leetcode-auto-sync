"""Regression tests for local Git automation."""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SERVER_DIR = Path(__file__).resolve().parents[1] / "server"
sys.path.insert(0, str(SERVER_DIR))

from git_service import (  # noqa: E402
    DetachedHeadError,
    GitNotInstalledError,
    GitService,
    InvalidRepositoryError,
    build_commit_message,
)


@unittest.skipIf(shutil.which("git") is None, "Git executable is required for integration tests.")
class GitServiceTests(unittest.TestCase):
    """Verify Git automation against temporary repositories."""

    def test_valid_repository(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            repo = self._init_repo(Path(tmp))

            service = GitService(repo, auto_push=False)
            service.verify_repository()

            self.assertEqual(service.current_branch(), self._current_branch(repo))

    def test_invalid_repository_returns_structured_error(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            service = GitService(Path(tmp), auto_push=False)

            result = service.automate(problem_id=49, title="Group Anagrams", change_status="created")

        self.assertEqual(result["status"], "error")
        self.assertEqual(result["error"]["code"], "invalid_repository")

    def test_invalid_repository_operation_raises_meaningful_exception(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            service = GitService(Path(tmp), auto_push=False)

            with self.assertRaises(InvalidRepositoryError):
                service.verify_repository()

    def test_no_changes_skips_commit_and_push(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            repo = self._init_repo(Path(tmp))
            self._commit_file(repo, "README.md", "initial\n", "Initial commit")

            result = GitService(repo, auto_push=True).automate(
                problem_id=49,
                title="Group Anagrams",
                change_status="created",
            )

        self.assertEqual(result, {"status": "no_changes"})

    def test_new_problem_commit_message_and_hash(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            repo = self._init_repo(Path(tmp))
            self._commit_file(repo, "README.md", "initial\n", "Initial commit")
            self._write_problem(repo, "Medium", "0049-Group-Anagrams", "solution.py", "code\n")

            result = GitService(repo, auto_push=False).automate(
                problem_id=49,
                title="Group Anagrams",
                change_status="created",
            )

            message = self._git(repo, "log", "-1", "--pretty=%s").stdout.strip()

        self.assertEqual(result["status"], "committed")
        self.assertEqual(message, "Add 0049 - Group Anagrams")
        self.assertFalse(result["pushed"])
        self.assertTrue(result["commit"])

    def test_updated_problem_commit_message(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            repo = self._init_repo(Path(tmp))
            self._commit_file(repo, "Leetcode-solutions/Medium/0049-Group-Anagrams/solution.py", "old\n", "Initial commit")
            (repo / "Leetcode-solutions" / "Medium" / "0049-Group-Anagrams" / "solution.py").write_text(
                "new\n",
                encoding="utf-8",
            )

            GitService(repo, auto_push=False).automate(
                problem_id=49,
                title="Group Anagrams",
                change_status="updated",
            )
            message = self._git(repo, "log", "-1", "--pretty=%s").stdout.strip()

        self.assertEqual(message, "Update 0049 - Group Anagrams")

    def test_push_succeeds_to_temporary_remote(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            remote = base / "remote.git"
            repo = base / "work"
            self._git(base, "init", "--bare", str(remote))
            self._git(base, "clone", str(remote), str(repo))
            self._configure_identity(repo)
            self._commit_file(repo, "README.md", "initial\n", "Initial commit")
            self._git(repo, "push", "origin", self._current_branch(repo))
            self._write_problem(repo, "Easy", "0001-Two-Sum", "solution.cpp", "code\n")

            result = GitService(repo, auto_push=True).automate(
                problem_id=1,
                title="Two Sum",
                change_status="created",
            )

            remote_head = self._git(remote, "rev-parse", "--short", "HEAD").stdout.strip()

        self.assertTrue(result["pushed"])
        self.assertEqual(result["commit"], remote_head)

    def test_push_disabled_commits_without_remote(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            repo = self._init_repo(Path(tmp))
            self._commit_file(repo, "README.md", "initial\n", "Initial commit")
            self._write_problem(repo, "Easy", "0001-Two-Sum", "solution.cpp", "code\n")

            result = GitService(repo, auto_push=False).automate(
                problem_id=1,
                title="Two Sum",
                change_status="created",
            )

        self.assertEqual(result["status"], "committed")
        self.assertFalse(result["pushed"])

    def test_missing_git_executable(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            repo = self._init_repo(Path(tmp))
            service = GitService(repo, git_executable="definitely-not-git")

            with self.assertRaises(GitNotInstalledError):
                service.verify_git_installed()

            result = service.automate(problem_id=1, title="Two Sum", change_status="created")

        self.assertEqual(result["error"]["code"], "git_not_installed")

    def test_missing_remote_returns_structured_error(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            repo = self._init_repo(Path(tmp))
            self._commit_file(repo, "README.md", "initial\n", "Initial commit")
            self._write_problem(repo, "Easy", "0001-Two-Sum", "solution.cpp", "code\n")

            result = GitService(repo, auto_push=True).automate(
                problem_id=1,
                title="Two Sum",
                change_status="created",
            )

        self.assertEqual(result["status"], "error")
        self.assertEqual(result["error"]["code"], "missing_remote")

    def test_detached_head_returns_structured_error(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            repo = self._init_repo(Path(tmp))
            self._commit_file(repo, "README.md", "initial\n", "Initial commit")
            commit = self._git(repo, "rev-parse", "HEAD").stdout.strip()
            self._git(repo, "checkout", commit)

            result = GitService(repo, auto_push=False).automate(
                problem_id=1,
                title="Two Sum",
                change_status="created",
            )

            with self.assertRaises(DetachedHeadError):
                GitService(repo, auto_push=False).current_branch()

        self.assertEqual(result["status"], "error")
        self.assertEqual(result["error"]["code"], "detached_head")

    def test_merge_conflict_returns_structured_error(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            repo = self._init_repo(Path(tmp))
            self._commit_file(repo, "conflict.txt", "base\n", "Initial commit")
            default_branch = self._current_branch(repo)
            self._git(repo, "checkout", "-b", "other")
            (repo / "conflict.txt").write_text("other\n", encoding="utf-8")
            self._git(repo, "commit", "-am", "Other change")
            self._git(repo, "checkout", default_branch)
            (repo / "conflict.txt").write_text("main\n", encoding="utf-8")
            self._git(repo, "commit", "-am", "Main change")
            subprocess.run(["git", "merge", "other"], cwd=repo, text=True, capture_output=True, check=False)

            result = GitService(repo, auto_push=False).automate(
                problem_id=1,
                title="Two Sum",
                change_status="created",
            )

        self.assertEqual(result["status"], "error")
        self.assertEqual(result["error"]["code"], "merge_conflicts")

    def test_build_commit_message(self) -> None:
        self.assertEqual(build_commit_message(49, "Group Anagrams", "created"), "Add 0049 - Group Anagrams")
        self.assertEqual(build_commit_message(49, "Group Anagrams", "updated"), "Update 0049 - Group Anagrams")

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

    def _write_problem(self, repo: Path, difficulty: str, problem_dir: str, filename: str, content: str) -> None:
        path = repo / "Leetcode-solutions" / difficulty / problem_dir / filename
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")

    def _current_branch(self, repo: Path) -> str:
        return self._git(repo, "symbolic-ref", "--quiet", "--short", "HEAD").stdout.strip()

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
