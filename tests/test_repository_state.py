"""Unit tests for RepositoryState snapshot."""

import sys
from pathlib import Path

SERVER_DIR = Path(__file__).resolve().parents[1] / "server"
if str(SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(SERVER_DIR))

from sync.repository_state import build_repository_state


def test_repository_state_empty(tmp_path: Path):
    state = build_repository_state(tmp_path)
    assert len(state.problems) == 0
    assert len(state.solved_problem_ids) == 0
    assert not state.is_duplicate_submission(1, "python", "code")


def test_repository_state_affected_topics(tmp_path: Path):
    state = build_repository_state(tmp_path)
    topics = state.get_affected_topics(["Array", "Hash Table", " "])
    assert topics == ["Array", "Hash Table"]
