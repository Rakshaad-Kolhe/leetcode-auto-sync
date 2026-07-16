"""Business logic for processing submissions.

Kept deliberately small for PR #2 — returns an acknowledgement payload
and isolates business rules from routing concerns.
"""

from __future__ import annotations

from typing import Dict

from git_service import GitService
from schemas import Submission
from repository_writer import write_submission
from root_readme import generate_readme


def process_submission(submission: Submission) -> Dict[str, object]:
    """Process an incoming submission by writing repository files.

    This function delegates filesystem operations to `repository_writer` so
    the API layer remains focused on validation and routing.
    """

    result = write_submission(submission)

    # After a successful write, regenerate the root README deterministically
    # by scanning the repository and writing the root README file.
    # Any failures here should propagate so callers are aware of issues.
    generate_readme()

    git_result = GitService().sync(
        problem_id=submission.id,
        title=submission.title,
        is_new_problem=result["status"] == "created",
    )
    if git_result.get("status") == "no_changes":
        return {"status": "no_changes"}

    result["git"] = git_result
    return result
