"""Reusable Git service, branch divergence recovery, and push reliability engine."""

from __future__ import annotations

import logging
import shutil
import subprocess
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

from config import AUTO_PUSH, DEFAULT_BRANCH, LEETCODE_REPO_PATH, REMOTE_NAME
from config.config_manager import AppConfig, ConfigManager, GitConfig
from retry import retry_with_backoff

logger = logging.getLogger(__name__)


class SafeDict(dict):
    """Fallback dictionary that preserves unknown format placeholders."""

    def __missing__(self, key: str) -> str:
        return f"{{{key}}}"


class GitServiceError(Exception):
    """Base class for expected Git service failures."""

    code = "git_error"

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message

    def to_dict(self) -> Dict[str, str]:
        """Return a JSON-safe error payload."""
        return {"code": self.code, "message": self.message}


class GitNotInstalledError(GitServiceError):
    """Raised when the Git executable cannot be found."""

    code = "git_not_installed"


class InvalidRepositoryError(GitServiceError):
    """Raised when the configured path is not a Git repository."""

    code = "invalid_repository"


class DetachedHeadError(GitServiceError):
    """Raised when the repository is in detached HEAD state."""

    code = "detached_head"


class PushFailedError(GitServiceError):
    """Raised when Git push fails."""

    code = "push_failed"


class CommitFailedError(GitServiceError):
    """Raised when Git commit fails."""

    code = "commit_failed"


class MissingRemoteError(GitServiceError):
    """Raised when the configured remote is missing."""

    code = "missing_remote"


class RemoteAheadError(GitServiceError):
    """Raised when remote branch has newer commits not present locally."""

    code = "remote_ahead"


class BranchDivergedError(GitServiceError):
    """Raised when local and remote branches contain unique commits."""

    code = "branch_diverged"


class MergeConflictError(GitServiceError):
    """Raised when automatic rebase encounters merge conflicts."""

    code = "merge_conflict"


class AuthenticationError(GitServiceError):
    """Raised when Git authentication / credentials fail."""

    code = "authentication_failed"


class GitService:
    """Run local Git commands with structured results, branch state analysis, and recovery."""

    def __init__(
        self,
        repo_path: Path | str | None = None,
        *,
        auto_commit: bool | None = None,
        auto_push: bool | None = None,
        auto_rebase: bool | None = None,
        commit_message: str | None = None,
        remote_name: str = REMOTE_NAME,
        default_branch: str = DEFAULT_BRANCH,
        git_executable: str = "git",
        config: AppConfig | GitConfig | ConfigManager | None = None,
    ) -> None:
        self.repo_path = Path(repo_path or LEETCODE_REPO_PATH).expanduser().resolve()

        if isinstance(config, AppConfig):
            git_cfg = config.git
        elif isinstance(config, GitConfig):
            git_cfg = config
        elif isinstance(config, ConfigManager):
            git_cfg = config.get_config().git
        else:
            git_cfg = ConfigManager.get_instance(repo_root=self.repo_path).get_config().git

        self.auto_commit = git_cfg.auto_commit if auto_commit is None else auto_commit
        self.auto_push = git_cfg.auto_push if auto_push is None else auto_push
        self.auto_rebase = getattr(git_cfg, "auto_rebase", True) if auto_rebase is None else auto_rebase
        self.commit_message_template = git_cfg.commit_message if commit_message is None else commit_message

        self.remote_name = remote_name
        self.default_branch = default_branch
        self.git_executable = git_executable

    def sync(
        self,
        *,
        problem_id: int,
        title: str,
        is_new_problem: bool,
        difficulty: str = "",
        language: str = "",
        trace_id: str | None = None,
    ) -> Dict[str, Any]:
        """Synchronize repository changes for a problem submission."""
        logger.info("git_sync_started", extra={"problem_id": problem_id, "trace_id": trace_id})
        try:
            self.verify_repository()
            branch_info = self.get_current_branch()
            branch = branch_info["branch"]

            status = self.get_status()

            staged_files: List[str] = []
            if not status["clean"]:
                staged = self.stage_changes()
                staged_files = staged["files"]

            if not staged_files and status["clean"]:
                logger.info("git_sync_no_changes")
                return {"status": "no_changes"}

            message = generate_problem_commit_message(
                problem_id,
                title,
                is_new_problem=is_new_problem,
                template=self.commit_message_template,
                difficulty=difficulty,
                language=language,
                trace_id=trace_id,
            )

            commit = self.commit_changes(message)
            commit_hash = commit["commit"]

            pushed = False
            if self.auto_push:
                self.push_changes(branch)
                pushed = True

            logger.info("git_sync_completed", extra={"commit": commit_hash, "pushed": pushed})
            return {
                "status": "success",
                "branch": branch,
                "commit": commit_hash,
                "pushed": pushed,
                "files": staged_files,
            }
        except GitServiceError as exc:
            logger.error(f"git_sync_failed: {exc.message}")
            return {"status": "error", "error": exc.to_dict()}

    def verify_repository(self) -> Dict[str, Any]:
        """Verify that the path is a valid Git repository."""
        self._ensure_git_installed()
        if not self.repo_path.exists() or not self.repo_path.is_dir():
            raise InvalidRepositoryError(f"Path does not exist or is not a directory: {self.repo_path}")

        git_dir = self.repo_path / ".git"
        if not git_dir.exists():
            raise InvalidRepositoryError(f"Not a Git repository (missing .git directory): {self.repo_path}")

        try:
            self._run(["rev-parse", "--is-inside-work-tree"])
        except GitServiceError as exc:
            raise InvalidRepositoryError(f"Invalid Git repository at: {self.repo_path}") from exc

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

    def fetch_remote(self, remote: str | None = None) -> None:
        """Fetch remote updates from configured remote."""
        self._ensure_git_installed()
        target_remote = remote or self.remote_name
        self._verify_remote()

        try:
            self._run(["fetch", target_remote])
        except GitServiceError as exc:
            msg = str(exc.message).lower()
            if "authentication failed" in msg or "could not read username" in msg or "denied" in msg:
                raise AuthenticationError(f"Git authentication failed for remote '{target_remote}'.") from exc
            raise PushFailedError(f"Git fetch failed for remote '{target_remote}': {exc.message}") from exc

    def get_branch_status(self, remote: str | None = None, branch: str | None = None) -> Dict[str, Any]:
        """Inspect branch status relative to remote branch (ahead/behind/diverged)."""
        self._ensure_git_installed()
        target_remote = remote or self.remote_name
        target_branch = branch or self.get_current_branch()["branch"]

        local_head = self._run(["rev-parse", "HEAD"]).stdout.strip()

        # Try to resolve remote ref
        remote_ref = f"{target_remote}/{target_branch}"
        try:
            remote_head = self._run(["rev-parse", remote_ref]).stdout.strip()
        except GitServiceError:
            return {
                "local_head": local_head,
                "remote_head": "none",
                "ahead_count": 1,
                "behind_count": 0,
                "state": "MISSING_UPSTREAM",
                "can_push": True,
            }

        ahead = int(self._run(["rev-list", "--count", f"{remote_ref}..HEAD"]).stdout.strip() or "0")
        behind = int(self._run(["rev-list", "--count", f"HEAD..{remote_ref}"]).stdout.strip() or "0")

        if ahead == 0 and behind == 0:
            state = "CLEAN"
        elif ahead > 0 and behind == 0:
            state = "AHEAD_ONLY"
        elif ahead == 0 and behind > 0:
            state = "BEHIND_ONLY"
        else:
            state = "DIVERGED"

        can_push = state in ("CLEAN", "AHEAD_ONLY", "MISSING_UPSTREAM")
        return {
            "local_head": local_head,
            "remote_head": remote_head,
            "ahead_count": ahead,
            "behind_count": behind,
            "state": state,
            "can_push": can_push,
        }

    def rebase_from_upstream(self, remote: str | None = None, branch: str | None = None) -> None:
        """Attempt safe rebase from remote branch, rolling back cleanly if conflicts occur."""
        target_remote = remote or self.remote_name
        target_branch = branch or self.get_current_branch()["branch"]

        logger.info(f"[GIT] Attempting safe pull --rebase from '{target_remote}/{target_branch}'...")
        try:
            self._run(["pull", "--rebase", target_remote, target_branch])
            logger.info("[GIT] Automatic rebase completed successfully.")
        except GitServiceError as exc:
            logger.warning(f"[GIT] Rebase encountered conflicts: {exc.message}. Rolling back via git rebase --abort...")
            try:
                self._run(["rebase", "--abort"])
            except GitServiceError:
                pass
            raise MergeConflictError(
                f"Automatic rebase failed with merge conflicts on '{target_branch}'. Safe rollback executed."
            ) from exc

    @retry_with_backoff(max_retries=3, initial_delay=0.1, exceptions=(PushFailedError, GitServiceError))
    def push_changes(self, branch: str | None = None) -> Dict[str, Any]:
        """Push the requested branch to remote, with pre-push branch state analysis and post-push verification."""
        self._ensure_git_installed()
        target_branch = branch or self.get_current_branch()["branch"]
        self._verify_remote()

        # Step 1: Fetch remote
        self.fetch_remote()

        # Step 2: Compare branch state
        b_status = self.get_branch_status(branch=target_branch)

        if not b_status["can_push"]:
            if b_status["state"] == "BEHIND_ONLY":
                if self.auto_rebase:
                    self.rebase_from_upstream(branch=target_branch)
                    b_status = self.get_branch_status(branch=target_branch)
                else:
                    raise RemoteAheadError(
                        f"Remote branch '{target_branch}' is ahead by {b_status['behind_count']} commits. Pull/rebase required."
                    )
            elif b_status["state"] == "DIVERGED":
                if self.auto_rebase:
                    self.rebase_from_upstream(branch=target_branch)
                    b_status = self.get_branch_status(branch=target_branch)
                else:
                    raise BranchDivergedError(
                        f"Local and remote branch '{target_branch}' have diverged. Safe rebase required."
                    )

        # Step 3: Execute Push
        try:
            self._run(["push", self.remote_name, target_branch])
        except GitServiceError as exc:
            msg = str(exc.message).lower()
            if "authentication failed" in msg or "denied" in msg:
                raise AuthenticationError(f"Git authentication failed for push to remote '{self.remote_name}'.") from exc
            raise PushFailedError(f"Git push to remote '{self.remote_name}' failed: {exc.message}") from exc

        # Step 4: Post-Push Remote Verification (Confirm remote SHA matches local HEAD)
        self.fetch_remote()
        post_status = self.get_branch_status(branch=target_branch)
        if post_status["ahead_count"] > 0:
            raise PushFailedError(
                f"Push verification failed: local branch is still {post_status['ahead_count']} commits ahead of remote after push."
            )

        logger.info("git_push_completed", extra={"remote": self.remote_name, "branch": target_branch})
        return {
            "pushed": True,
            "remote": self.remote_name,
            "branch": target_branch,
            "local_head": post_status["local_head"],
            "remote_head": post_status["remote_head"],
            "auto_push": self.auto_push,
        }

    def verify_git_identity(self) -> Dict[str, Any]:
        """Verify git user.name and user.email configuration for identity attribution."""
        self._ensure_git_installed()
        try:
            name = self._run(["config", "user.name"]).stdout.strip()
        except GitServiceError:
            name = ""

        try:
            email = self._run(["config", "user.email"]).stdout.strip()
        except GitServiceError:
            email = ""

        is_valid = bool(name and email and "@" in email and not email.endswith("@example.com"))
        return {
            "valid": is_valid,
            "name": name,
            "email": email,
            "reasons": [] if is_valid else ["Missing or invalid git user.name / user.email config"],
        }

    def check_contribution_eligibility(self) -> Dict[str, Any]:
        """Verify GitHub contribution graph attribution requirements."""
        identity = self.verify_git_identity()
        reasons = []
        warnings = []

        if not identity["valid"]:
            reasons.append("Git user identity (user.name / user.email) is unconfigured or invalid")

        try:
            branch_info = self.get_current_branch()
            if not branch_info["is_default"]:
                warnings.append(
                    f"Commits on branch '{branch_info['branch']}' may not appear in GitHub contributions until merged into default branch '{self.default_branch}'"
                )
        except GitServiceError as e:
            warnings.append(str(e))

        try:
            self._verify_remote()
        except GitServiceError as e:
            warnings.append(str(e))

        is_eligible = len(reasons) == 0
        return {
            "eligible": is_eligible,
            "reasons": reasons,
            "warnings": warnings,
            "user_email": identity["email"],
            "user_name": identity["name"],
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
                capture_output=True,
                text=True,
                check=True,
            )
        except FileNotFoundError as exc:
            raise GitNotInstalledError(f"Git executable '{self.git_executable}' was not found.") from exc
        except subprocess.CalledProcessError as exc:
            stderr = exc.stderr.strip()
            raise GitServiceError(f"Git command '{' '.join(command)}' failed: {stderr}") from exc


def generate_problem_commit_message(
    problem_id: int,
    title: str,
    *,
    is_new_problem: bool = True,
    template: str = "{action} {problem_number} - {problem_title}",
    difficulty: str = "",
    language: str = "",
    trace_id: str | None = None,
) -> str:
    """Generate a formatted commit message for a problem write based on a template."""
    action = "Add" if is_new_problem else "Update"
    padded_id = f"{problem_id:04d}" if isinstance(problem_id, int) else str(problem_id)

    if "{action}" not in template and not is_new_problem and template.startswith("Add "):
        template = "Update " + template[4:]

    short_trace = trace_id[:8] if trace_id and len(trace_id) >= 8 else trace_id or ""
    mapping = SafeDict(
        problem_number=padded_id,
        problem_id=padded_id,
        problem_title=title,
        title=title,
        difficulty=difficulty,
        language=language,
        action=action,
        trace_id=short_trace,
    )
    try:
        msg = template.format_map(mapping)
    except Exception:
        msg = f"{action} {padded_id} - {title}"

    if trace_id and "{trace_id}" not in template:
        short_id = trace_id[:8] if len(trace_id) >= 8 else trace_id
        msg += f" (Trace: {short_id})"

    return msg


def _parse_status_line(line: str) -> Dict[str, str]:
    status = line[:2]
    path = line[3:] if len(line) > 3 else ""
    return {"status": status, "path": path}
