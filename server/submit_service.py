"""Business logic for processing submissions."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Dict

from git_service import GitService
from repository_writer import write_submission
from root_readme import generate_readme
from schemas import Submission

logger = logging.getLogger(__name__)


def process_submission(submission: Submission) -> Dict[str, object]:
    """Process an incoming submission by writing repository files.

    This function delegates filesystem operations to `repository_writer` so
    the API layer remains focused on validation and routing.
    """

    result = write_submission(submission)

    # After a successful write, regenerate the root README deterministically.
    generate_readme(Path(result["repository_path"]))

    git_result = GitService().sync(
        problem_id=submission.id,
        title=submission.title,
        is_new_problem=result["status"] == "created",
    )

    if git_result.get("status") == "no_changes":
        logger.info("Commit:\nno_changes")
        logger.info("Push:\nskipped")
        return {"status": "no_changes"}

    commit_hash = git_result.get("commit", "none")
    pushed = git_result.get("pushed", False)
    push_status = "successful" if pushed else "disabled"

    if git_result.get("status") == "error":
        push_status = "failed"

    logger.info(f"Commit:\n{commit_hash}")
    logger.info(f"Push:\n{push_status}")

    result["git"] = git_result
    return result
