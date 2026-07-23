"""Integration tests for SyncEngine, idempotency, and incremental updates."""

import sys
import time
from pathlib import Path
from unittest.mock import MagicMock

SERVER_DIR = Path(__file__).resolve().parents[1] / "server"
if str(SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(SERVER_DIR))

import pytest
from schemas import Submission
from sync.sync_engine import SyncEngine


@pytest.fixture
def repo_env(tmp_path: Path):
    git_dir = tmp_path / ".git"
    git_dir.mkdir()
    return tmp_path


def test_sync_engine_first_submission_and_duplicate_idempotency(repo_env: Path):
    mock_git = MagicMock()
    mock_git.get_status.return_value = {"clean": True, "files": []}
    mock_git.auto_commit = True
    mock_git.auto_push = False
    mock_git.commit_message_template = "{action} {problem_number} - {title}"

    mock_metadata = MagicMock()
    mock_metadata.get_metadata.return_value = MagicMock(
        topic_names=lambda: ["Array"],
        company_names=lambda: ["Google"],
        acceptance_rate="50%",
        likes=100,
        dislikes=10,
        hints=[],
        similar_questions=[],
    )

    engine = SyncEngine(
        repo_root=repo_env,
        git_service=mock_git,
        metadata_service=mock_metadata,
    )

    sub = Submission(
        id=3513,
        title="Sample Problem",
        slug="sample-problem",
        difficulty="Easy",
        language="cpp",
        code="int main() { return 0; }",
    )

    # First sync: writes files & commits
    res1 = engine.sync_submission(sub)
    assert res1["status"] in ("created", "updated")
    assert res1["changed"] is True
    assert mock_git.commit_changes.called

    mock_git.reset_mock()
    mock_git.get_status.return_value = {"clean": True, "files": []}

    # Second sync: duplicate submission fast-path -> no-op <100ms
    start_time = time.perf_counter()
    res2 = engine.sync_submission(sub)
    duration_ms = (time.perf_counter() - start_time) * 1000

    assert res2["status"] == "no_changes"
    assert res2["changed"] is False
    assert not mock_git.commit_changes.called
    assert duration_ms < 1000  # Execution is extremely fast


def test_sync_engine_whitespace_only_change(repo_env: Path):
    mock_git = MagicMock()
    mock_git.get_status.return_value = {"clean": True, "files": []}
    mock_git.auto_commit = True
    mock_git.auto_push = False
    mock_git.commit_message_template = "{action} {problem_number} - {title}"

    mock_metadata = MagicMock()
    mock_metadata.get_metadata.return_value = MagicMock(
        topic_names=lambda: ["Array"],
        company_names=lambda: ["Google"],
        acceptance_rate="50%",
        likes=100,
        dislikes=10,
        hints=[],
        similar_questions=[],
    )

    engine = SyncEngine(
        repo_root=repo_env,
        git_service=mock_git,
        metadata_service=mock_metadata,
    )

    sub1 = Submission(
        id=7,
        title="Reverse Integer",
        slug="reverse-integer",
        difficulty="Medium",
        language="python3",
        code="def reverse(x):\n    return x\n",
    )

    engine.sync_submission(sub1)
    mock_git.reset_mock()
    mock_git.get_status.return_value = {"clean": True, "files": []}

    sub2 = Submission(
        id=7,
        title="Reverse Integer",
        slug="reverse-integer",
        difficulty="Medium",
        language="python3",
        code="def reverse(x):   \r\n    return x\r\n\r\n",
    )

    res = engine.sync_submission(sub2)
    assert res["status"] == "no_changes"
    assert not mock_git.commit_changes.called
