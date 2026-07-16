"""Reusable Git service foundation.

This module encapsulates local Git operations behind a small Python API.
It is intentionally not wired into the submission pipeline yet.
"""

from __future__ import annotations

import logging
import shutil
import subprocess
from pathlib import Path
from typing import Any, Dict, List

from config import AUTO_PUSH, DEFAULT_BRANCH, LEETCODE_REPO_PATH, REMOTE_NAME

logger = logging.getLogger(__name__)


class GitServiceError(Exception):
    """Base class for expected Git service failures."""


class GitNotInstalledError(GitServiceError):
    """Raised when the Git executable cannot be found."""


class InvalidRepositoryError(GitServiceError):
    """Raised when the configured path is not a Git repository."""


class DetachedHeadError(GitServiceError):
    """Raised when the repository is in detached HEAD state."""


class PushFailedError(GitServiceError):
    """Raised when Git push fails."""


class CommitFailedError(GitServiceError):
    """Raised when Git commit fails."""


class MissingRemoteError(GitServiceError):
    """Raised when the configured remote is missing."""


class GitService:
    """Run local Git commands with structured results and custom exceptions."""

    def __init__(
        self,
        repo_path: Path | str = LEETCODE_REPO_PATH,
        *,
        auto_push: bool = AUTO_PUSH,
        remote_name: str = REMOTE_NAME,
        default_branch: str = DEFAULT_BRANCH,
        git_executable: str = "git",
    ) -> None:
        self.repo_path = Path(repo_path).expanduser().resolve()
        self.auto_push = auto_push
        self.remote_name = remote_name
        self.default_branch = default_branch
        self.git_executable = git_executable

    def verify_repository(self) -> Dict[str, Any]:
        """Verify that repo_path points to a valid Git working tree."""

        self._ensure_git_installed()
        try:
            result = self._run(["rev-parse", "--is-inside-work-tree"])
        except GitServiceError as exc:
            raise InvalidRepositoryError(f"{self.repo_path} is not a valid Git repository.") from exc

        if result.stdout.strip() != "true":
            raise InvalidRepositoryError(f"{self.repo_path} is not a valid Git repository.")

        logger.info("git_repository_validated", extra={"repository_path": str(self.repo_path)})
        return {"valid": True, "repository": str(self.repo_path)}

    def get_current_branch(self) -> Dict[str, Any]:
        """Return the current branch name and whether it matches DEFAULT_BRANCH."""

        self._ensure_git_installed()
        try:
            result = self._run(["symbolic-ref", "--quiet", "--short", "HEAD"])
        except GitServiceError as exc:
            raise DetachedHeadError("Repository is in detached HEAD state.") from exc

        branch = result.stdout.strip()
        if not branch:
            raise DetachedHeadError("Repository is in detached HEAD state.")

        logger.info("git_current_branch", extra={"branch": branch})
        return {"branch": branch, "is_default": branch == self.default_branch}

    def get_status(self) -> Dict[str, Any]:
        """Return porcelain Git status as a structured result."""

        self._ensure_git_installed()
        result = self._run(["status", "--porcelain"])
        files = [_parse_status_line(line) for line in result.stdout.splitlines() if line]
        clean = not files

        logger.info("git_status_checked", extra={"clean": clean, "file_count": len(files)})
        return {"clean": clean, "files": files}

    def stage_changes(self) -> Dict[str, Any]:
        """Stage all repository changes with `git add .`."""

        self._ensure_git_installed()
        self._run(["add", "."])
        result = self._run(["diff", "--cached", "--name-only"])
        files = [line for line in result.stdout.splitlines() if line]

        logger.info("git_changes_staged", extra={"file_count": len(files)})
        return {"staged": True, "files": files}

    def commit_changes(self, message: str) -> Dict[str, Any]:
        """Create a commit and return the resulting short commit hash."""

        self._ensure_git_installed()
        try:
            self._run(["commit", "-m", message])
        except GitServiceError as exc:
            raise CommitFailedError("Git commit failed.") from exc

        commit_hash = self._run(["rev-parse", "--short", "HEAD"]).stdout.strip()
        logger.info("git_commit_created", extra={"commit": commit_hash})
        return {"committed": True, "commit": commit_hash, "message": message}

    def push_changes(self, branch: str | None = None) -> Dict[str, Any]:
        """Push the requested branch to the configured remote."""

        self._ensure_git_installed()
        target_branch = branch or self.get_current_branch()["branch"]
        self._verify_remote()

        try:
            self._run(["push", self.remote_name, target_branch])
        except GitServiceError as exc:
            raise PushFailedError(f"Git push to remote '{self.remote_name}' failed.") from exc

        logger.info("git_push_completed", extra={"remote": self.remote_name, "branch": target_branch})
        return {
            "pushed": True,
            "remote": self.remote_name,
            "branch": target_branch,
            "auto_push": self.auto_push,
        }

    def _verify_remote(self) -> None:
        try:
            self._run(["remote", "get-url", self.remote_name])
        except GitServiceError as exc:
            raise MissingRemoteError(f"Git remote '{self.remote_name}' is not configured.") from exc

    def _ensure_git_installed(self) -> None:
        if shutil.which(self.git_executable) is None:
            raise GitNotInstalledError("Git executable was not found on PATH.")

    def _run(self, args: List[str]) -> subprocess.CompletedProcess[str]:
        command = [self.git_executable, *args]
        try:
            return subprocess.run(
                command,
                cwd=self.repo_path,
                text=True,
                capture_output=True,
                check=True,
            )
        except FileNotFoundError as exc:
            raise GitNotInstalledError("Git executable was not found on PATH.") from exc
        except subprocess.CalledProcessError as exc:
            message = (exc.stderr or exc.stdout or "Git command failed.").strip()
            raise GitServiceError(message) from exc


def generate_problem_commit_message(problem_id: int, title: str, *, is_new_problem: bool) -> str:
    """Generate a deterministic commit message for a problem write."""

    action = "Add" if is_new_problem else "Update"
    return f"{action} {problem_id:04d} - {title}"


def _parse_status_line(line: str) -> Dict[str, str]:
    status = line[:2]
    path = line[3:] if len(line) > 3 else ""
    return {"status": status, "path": path}
