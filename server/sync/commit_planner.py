"""Commit planning and Git operation decision engine."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional

from git_service import GitService, generate_problem_commit_message
from schemas import Submission

logger = logging.getLogger(__name__)


@dataclass
class CommitPlan:
    """Action plan indicating whether Git commit and push should execute."""

    should_commit: bool
    should_push: bool
    reason: str
    changed_files: List[str] = field(default_factory=list)
    commit_message: Optional[str] = None
    is_new_problem: bool = False


class CommitPlanner:
    """Evaluates repository changes and determines necessary Git operations."""

    def __init__(self, git_service: Optional[GitService] = None) -> None:
        self.git_service = git_service or GitService()

    def plan(
        self,
        submission: Submission,
        changed_files: List[str],
        is_new_problem: bool,
    ) -> CommitPlan:
        """Create a CommitPlan based on changed files and repository porcelain status."""
        self.git_service.verify_repository()
        repo_status = self.git_service.get_status()

        # If no files changed and git status is clean, skip commit & push
        if not changed_files and repo_status["clean"]:
            logger.info("[SYNC] Repository clean and no files changed. Commit & push skipped.")
            return CommitPlan(
                should_commit=False,
                should_push=False,
                reason="Repository up-to-date; no changes detected.",
                changed_files=[],
                is_new_problem=is_new_problem,
            )

        # Generate commit message
        message = generate_problem_commit_message(
            submission.id,
            submission.title,
            is_new_problem=is_new_problem,
            template=self.git_service.commit_message_template,
            difficulty=submission.difficulty,
            language=submission.language,
        )

        should_commit = self.git_service.auto_commit
        should_push = self.git_service.auto_push if should_commit else False

        reason = "Changes detected; scheduled for commit." if should_commit else "Changes staged only."

        return CommitPlan(
            should_commit=should_commit,
            should_push=should_push,
            reason=reason,
            changed_files=changed_files,
            commit_message=message,
            is_new_problem=is_new_problem,
        )
