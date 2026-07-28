"""Submission pipeline tests for Git integration."""

from __future__ import annotations

import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import server.services.repository_writer as repository_writer  # noqa: E402
import server.services.root_readme as root_readme  # noqa: E402
import server.services.submit_service as submit_service  # noqa: E402
from server.services.git_service import GitService, DetachedHeadError  # noqa: E402
from server.schemas import Submission  # noqa: E402


class SubmitGitIntegrationTests(unittest.TestCase):
    """Verify POST /submit business flow through Git synchronization."""

    def test_new_submission_returns_git_metadata(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            repo = self._init_repo(Path(tmp))

            result = self._process(repo, self._submission(code="print('new')\n"))

            message = self._git(repo, "log", "-1", "--pretty=%s").stdout.strip()
            branch = self._current_branch(repo)

        self.assertEqual(result["status"], "created")
        self.assertEqual(result["problem"], {"id": 49, "title": "Group Anagrams"})
        self.assertTrue(message.startswith("Add 0049 - Group Anagrams"))
        self.assertIn("Trace:", message)
        self.assertEqual(result["git"]["branch"], branch)
        self.assertTrue(result["git"]["commit"])
        self.assertFalse(result["git"]["pushed"])

    def test_updated_submission_returns_git_metadata(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            repo = self._init_repo(Path(tmp))
            self._process(repo, self._submission(code="print('old')\n"))

            result = self._process(repo, self._submission(code="print('new')\n"))
            message = self._git(repo, "log", "-1", "--pretty=%s").stdout.strip()

        self.assertEqual(result["status"], "updated")
        self.assertTrue(message.startswith("Update 0049 - Group Anagrams"))
        self.assertIn("Trace:", message)
        self.assertFalse(result["git"]["pushed"])

    def test_no_changes_returns_top_level_no_changes(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            repo = self._init_repo(Path(tmp))
            submission = self._submission(code="print('same')\n")
            self._process(repo, submission)

            result = self._process(repo, submission)

        self.assertEqual(result, {"status": "no_changes"})

    def test_git_failure_aborts_before_file_writes_on_detached_head(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            repo = self._init_repo(Path(tmp))
            self._git(repo, "checkout", "--detach")

            with self.assertRaises(DetachedHeadError):
                self._process(repo, self._submission(code="print('new')\n"))

            solution_path = repo / "Medium" / "0049-Group Anagrams" / "solution.py"
            self.assertFalse(solution_path.exists())

    def _process(self, repo: Path, submission: Submission) -> dict[str, object]:
        with (
            patch.object(repository_writer, "LEETCODE_REPO_PATH", repo),
            patch.object(root_readme, "LEETCODE_REPO_PATH", repo),
            patch.object(submit_service, "GitService", lambda: GitService(repo, auto_push=False)),
        ):
            return submit_service.process_submission(submission)

    def _submission(self, *, code: str) -> Submission:
        return Submission(
            id=49,
            title="Group Anagrams",
            slug="group-anagrams",
            difficulty="Medium",
            language="python3",
            code=code,
        )

    def _init_repo(self, repo: Path) -> Path:
        repo.mkdir(parents=True, exist_ok=True)
        self._git(repo, "init")
        self._git(repo, "config", "user.email", "tests@example.com")
        self._git(repo, "config", "user.name", "Tests")
        self._commit_file(repo, ".gitkeep", "initial\n", "Initial commit")
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

    def _current_branch(self, repo: Path) -> str:
        return self._git(repo, "symbolic-ref", "--quiet", "--short", "HEAD").stdout.strip()


if __name__ == "__main__":
    unittest.main()
