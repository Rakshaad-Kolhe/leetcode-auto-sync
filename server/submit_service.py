"""Business logic for processing submissions.

Kept deliberately small for PR #2 — returns an acknowledgement payload
and isolates business rules from routing concerns.
"""

from __future__ import annotations

from typing import Dict

from schemas import Submission
from repository_writer import write_submission


def process_submission(submission: Submission) -> Dict[str, object]:
    """Process an incoming submission by writing repository files.

    This function delegates filesystem operations to `repository_writer` so
    the API layer remains focused on validation and routing.
    """

    try:
        result = write_submission(submission)
    except ValueError as exc:
        # Propagate a clear error for unsupported languages
        raise

    return result
