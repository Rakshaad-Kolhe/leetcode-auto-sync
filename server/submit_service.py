"""Business logic for processing submissions."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Dict, Optional

from git_service import GitService
from repository_writer import write_submission
from root_readme import generate_readme
from schemas import Submission
from sync import SyncEngine

logger = logging.getLogger(__name__)


def process_submission(submission: Submission, engine: Optional[SyncEngine] = None) -> Dict[str, object]:
    """Process an incoming submission using the intelligent SyncEngine."""
    if engine is None:
        git_inst = GitService()
        sync_engine = SyncEngine(repo_root=git_inst.repo_path, git_service=git_inst)
    else:
        sync_engine = engine

    result = sync_engine.sync_submission(submission)

    git_result = result.get("git", {})
    git_status = git_result.get("status", "no_changes")

    if git_status == "no_changes" or result.get("status") == "no_changes":
        logger.info("Commit:\nno_changes")
        logger.info("Push:\nskipped")
        return {"status": "no_changes"}

    if git_status == "staged_only":
        logger.info("Commit:\nskipped (staged only)")
        logger.info("Push:\nskipped")
        return result

    commit_hash = git_result.get("commit", "none")
    pushed = git_result.get("pushed", False)
    push_status = "successful" if pushed else "disabled"
    if git_status == "error":
        push_status = "failed"

    logger.info(f"Commit:\n{commit_hash}")
    logger.info(f"Push:\n{push_status}")

    return result
