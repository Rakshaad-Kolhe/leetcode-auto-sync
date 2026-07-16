"""Git automation for the local LeetCode repository.

All Git commands are isolated in this module so API routes and business
services never call the Git executable directly.
"""

from __future__ import annotations

import logging
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List

from config import AUTO_PUSH, DEFAULT_BRANCH, LEETCODE_REPO_PATH, REMOTE_NAME

logger = logging.getLogger(__name__)


class GitServiceError(Exception):
    """Base exception for expected Git automation failures."""

    code = "git_error"

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message

    def to_dict(self) -> Dict[str, str]:
        """Return a JSON-serializable representation."""

        return {"code": self.code, "message": self.message}


class GitNotInstalledError(GitServiceError):
    code = "git_not_installed"


class InvalidRepositoryError(GitServiceError):
    code = "invalid_repository"


class CommitFailureError(GitServiceError):
    code = "commit_failure"


class PushFailureError(GitServiceError):
    code = "push_failure"


class MissingRemoteError(GitServiceError):
    code = "missing_remote"


class MergeConflictError(GitServiceError):
    code = "merge_conflicts"


class DetachedHeadError(GitServiceError):
    code = "detached_head"


@dataclass(frozen=True)
class GitStatus:
    """Parsed Git working tree status."""

    changed_files: List[str]

    @property
    def has_changes(self) -> bool:
        """Return whether Git reports modified, staged, or untracked files."""

        return bool(self.changed_files)


class GitService:
    """Run local Git commands and return structured automation results."""

    def __init__(
        self,
        repo_path: Path | str = LEETCODE_REPO_PATH,
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

    def automate(self, *, problem_id: int, title: str, change_status: str) -> Dict[str, Any]:
        """Stage, commit, and optionally push repository changes."""

        try:
            return self._automate(problem_id=problem_id, title=title, change_status=change_status)
        except GitServiceError as exc:
            logger.error("git_automation_failed", extra={"error_code": exc.code})
            return {"status": "error", "error": exc.to_dict()}

    def _automate(self, *, problem_id: int, title: str, change_status: str) -> Dict[str, Any]:
        self.verify_git_installed()
        self.verify_repository()
        branch = self.current_branch()
        status = self.status()

        if not status.has_changes:
            logger.info("git_no_changes", extra={"branch": branch})
            return {"status": "no_changes"}

        staged_files = self.stage_all()
        commit_message = build_commit_message(problem_id, title, change_status)
        commit_hash = self.commit(commit_message)

        pushed = False
        if self.auto_push:
            self.push()
            pushed = True

        return {
            "status": "committed",
            "commit": commit_hash,
            "branch": branch,
            "pushed": pushed,
            "files": staged_files,
        }

    def verify_git_installed(self) -> None:
        """Raise if the configured Git executable is unavailable."""

        if shutil.which(self.git_executable) is None:
            raise GitNotInstalledError("Git executable was not found on PATH.")

    def verify_repository(self) -> None:
        """Raise if repo_path is not inside a valid Git repository."""

        try:
            result = self._run(["rev-parse", "--is-inside-work-tree"])
        except GitServiceError as exc:
            raise InvalidRepositoryError(f"{self.repo_path} is not a valid Git repository.") from exc

        if result.stdout.strip() != "true":
            raise InvalidRepositoryError(f"{self.repo_path} is not a valid Git repository.")

        logger.info("git_repository_validated", extra={"repository_path": str(self.repo_path)})

    def current_branch(self) -> str:
        """Return the current branch name, rejecting detached HEAD."""

        try:
            result = self._run(["symbolic-ref", "--quiet", "--short", "HEAD"])
        except GitServiceError as exc:
            raise DetachedHeadError("Repository is in detached HEAD state.") from exc

        branch = result.stdout.strip()
        if not branch:
            raise DetachedHeadError("Repository is in detached HEAD state.")

        logger.info(
            "git_current_branch",
            extra={"branch": branch, "default_branch": self.default_branch},
        )
        return branch

    def status(self) -> GitStatus:
        """Return changed files from porcelain status output."""

        result = self._run(["status", "--porcelain"])
        changed_files = []
        for line in result.stdout.splitlines():
            if _is_conflict_status(line):
                raise MergeConflictError("Repository has unresolved merge conflicts.")
            if line:
                changed_files.append(line[3:] if len(line) > 3 else line)

        return GitStatus(changed_files=changed_files)

    def stage_all(self) -> List[str]:
        """Stage all repository changes and return staged file paths."""

        self._run(["add", "."])
        result = self._run(["diff", "--cached", "--name-only"])
        staged_files = [line for line in result.stdout.splitlines() if line]
        logger.info("git_files_staged", extra={"files_staged": staged_files})
        return staged_files

    def commit(self, message: str) -> str:
        """Create a Git commit and return its short hash."""

        try:
            self._run(["commit", "-m", message])
        except GitServiceError as exc:
            raise CommitFailureError("Git commit failed.") from exc

        result = self._run(["rev-parse", "--short", "HEAD"])
        commit_hash = result.stdout.strip()
        logger.info("git_commit_created", extra={"commit": commit_hash})
        return commit_hash

    def push(self) -> None:
        """Push the current branch to the configured remote."""

        branch = self.current_branch()
        self._verify_remote()
        try:
            self._run(["push", self.remote_name, branch])
        except GitServiceError as exc:
            raise PushFailureError(f"Git push to remote '{self.remote_name}' failed.") from exc

        logger.info("git_push_succeeded", extra={"remote": self.remote_name, "branch": branch})

    def _verify_remote(self) -> None:
        try:
            self._run(["remote", "get-url", self.remote_name])
        except GitServiceError as exc:
            raise MissingRemoteError(f"Git remote '{self.remote_name}' is not configured.") from exc

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
            stderr = (exc.stderr or "").strip()
            stdout = (exc.stdout or "").strip()
            detail = stderr or stdout or f"Git command failed: {' '.join(command)}"
            raise GitServiceError(detail) from exc


def build_commit_message(problem_id: int, title: str, change_status: str) -> str:
    """Build a deterministic problem commit message."""

    verb = "Add" if change_status == "created" else "Update"
    return f"{verb} {problem_id:04d} - {title}"


def _is_conflict_status(line: str) -> bool:
    if len(line) < 2:
        return False
    return line[:2] in {"DD", "AU", "UD", "UA", "DU", "AA", "UU"} or "U" in line[:2]
