"""Unit tests for CommitPlanner."""

import sys
from pathlib import Path
from unittest.mock import MagicMock

SERVER_DIR = Path(__file__).resolve().parents[1] / "server"
if str(SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(SERVER_DIR))

from schemas import Submission
from sync.commit_planner import CommitPlanner


def test_commit_planner_clean_repo_no_changed_files():
    mock_git = MagicMock()
    mock_git.get_status.return_value = {"clean": True, "files": []}
    mock_git.commit_message_template = "{action} {problem_number} - {title}"

    planner = CommitPlanner(git_service=mock_git)
    submission = Submission(
        id=1,
        title="Two Sum",
        slug="two-sum",
        difficulty="Easy",
        language="python3",
        code="class Solution: pass",
    )

    plan = planner.plan(submission, changed_files=[], is_new_problem=False)
    assert not plan.should_commit
    assert not plan.should_push
    assert "no changes" in plan.reason.lower()


def test_commit_planner_changed_files():
    mock_git = MagicMock()
    mock_git.get_status.return_value = {"clean": False, "files": [{"status": "M ", "path": "Easy/0001-Two Sum/solution.py"}]}
    mock_git.auto_commit = True
    mock_git.auto_push = True
    mock_git.commit_message_template = "{action} {problem_number} - {title}"

    planner = CommitPlanner(git_service=mock_git)
    submission = Submission(
        id=1,
        title="Two Sum",
        slug="two-sum",
        difficulty="Easy",
        language="python3",
        code="class Solution: pass",
    )

    plan = planner.plan(submission, changed_files=["Easy/0001-Two Sum/solution.py"], is_new_problem=True)
    assert plan.should_commit
    assert plan.should_push
    assert plan.commit_message == "Add 0001 - Two Sum"
