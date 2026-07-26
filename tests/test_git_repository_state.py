"""Comprehensive unit & integration tests for Git repository state detection and safe synchronization pipeline."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import pytest
from server.git_service import (
    GitService,
    GitRepositoryState,
    RepositoryStatus,
    RepositoryDivergedError,
    DirtyWorkingTreeError,
    DetachedHeadError,
    FastForwardFailedError,
    InvalidRepositoryError,
)
from server.schemas import Submission
from server.sync.sync_engine import SyncEngine


@pytest.fixture
def git_remote_and_local(tmp_path: Path):
    """Fixture creating a bare remote repository and a cloned local repository."""
    remote_dir = tmp_path / "remote-repo.git"
    remote_dir.mkdir()
    subprocess.run(["git", "init", "--bare"], cwd=remote_dir, check=True, capture_output=True)
    subprocess.run(["git", "symbolic-ref", "HEAD", "refs/heads/main"], cwd=remote_dir, check=True, capture_output=True)

    local_dir = tmp_path / "local-repo"
    local_dir.mkdir()
    subprocess.run(["git", "init"], cwd=local_dir, check=True, capture_output=True)
    subprocess.run(["git", "config", "user.name", "Test User"], cwd=local_dir, check=True, capture_output=True)
    subprocess.run(["git", "config", "user.email", "test@example.com"], cwd=local_dir, check=True, capture_output=True)

    init_file = local_dir / "README.md"
    init_file.write_text("# Initial\n", encoding="utf-8")
    subprocess.run(["git", "add", "."], cwd=local_dir, check=True, capture_output=True)
    subprocess.run(["git", "commit", "-m", "Initial commit"], cwd=local_dir, check=True, capture_output=True)
    subprocess.run(["git", "branch", "-M", "main"], cwd=local_dir, check=True, capture_output=True)
    subprocess.run(["git", "remote", "add", "origin", str(remote_dir)], cwd=local_dir, check=True, capture_output=True)
    subprocess.run(["git", "push", "-u", "origin", "main"], cwd=local_dir, check=True, capture_output=True)

    return {"remote": remote_dir, "local": local_dir}


def test_repository_state_dataclass_immutability():
    state = GitRepositoryState(
        status=RepositoryStatus.CLEAN,
        branch="main",
        local_head="1234567",
        remote_head="1234567",
        ahead=0,
        behind=0,
    )
    assert state.is_safe is True
    assert state.status == RepositoryStatus.CLEAN
    with pytest.raises(AttributeError):
        state.status = RepositoryStatus.DIRTY  # type: ignore[misc]


def test_analyze_repository_clean(git_remote_and_local: dict):
    local_dir = git_remote_and_local["local"]
    git_srv = GitService(repo_path=local_dir)
    state = git_srv.analyze_repository()

    assert state.status == RepositoryStatus.CLEAN
    assert state.is_safe is True
    assert state.ahead == 0
    assert state.behind == 0
    assert state.branch == "main"


def test_analyze_repository_ahead(git_remote_and_local: dict):
    local_dir = git_remote_and_local["local"]
    (local_dir / "ahead.txt").write_text("ahead content", encoding="utf-8")
    subprocess.run(["git", "add", "."], cwd=local_dir, check=True, capture_output=True)
    subprocess.run(["git", "commit", "-m", "Local ahead commit"], cwd=local_dir, check=True, capture_output=True)

    git_srv = GitService(repo_path=local_dir)
    state = git_srv.analyze_repository()

    assert state.status == RepositoryStatus.AHEAD
    assert state.is_safe is True
    assert state.ahead == 1
    assert state.behind == 0


def test_analyze_repository_behind_fast_forward(git_remote_and_local: dict, tmp_path: Path):
    remote_dir = git_remote_and_local["remote"]
    local_dir = git_remote_and_local["local"]

    # Clone second workspace and push remote commit
    other_dir = tmp_path / "other-repo"
    subprocess.run(["git", "clone", str(remote_dir), str(other_dir)], check=True, capture_output=True)
    subprocess.run(["git", "config", "user.name", "Other User"], cwd=other_dir, check=True, capture_output=True)
    subprocess.run(["git", "config", "user.email", "other@example.com"], cwd=other_dir, check=True, capture_output=True)
    (other_dir / "remote_file.txt").write_text("remote file", encoding="utf-8")
    subprocess.run(["git", "add", "."], cwd=other_dir, check=True, capture_output=True)
    subprocess.run(["git", "commit", "-m", "Remote commit"], cwd=other_dir, check=True, capture_output=True)
    subprocess.run(["git", "push", "origin", "main"], cwd=other_dir, check=True, capture_output=True)

    git_srv = GitService(repo_path=local_dir)
    state = git_srv.analyze_repository()

    assert state.status == RepositoryStatus.BEHIND
    assert state.is_safe is True
    assert state.behind == 1

    # Fast-forward pull
    git_srv.fast_forward_pull()
    post_state = git_srv.analyze_repository()
    assert post_state.status == RepositoryStatus.CLEAN


def test_analyze_repository_diverged_aborts(git_remote_and_local: dict, tmp_path: Path):
    remote_dir = git_remote_and_local["remote"]
    local_dir = git_remote_and_local["local"]

    # Other repo pushes commit
    other_dir = tmp_path / "other-repo"
    subprocess.run(["git", "clone", str(remote_dir), str(other_dir)], check=True, capture_output=True)
    subprocess.run(["git", "config", "user.name", "Other User"], cwd=other_dir, check=True, capture_output=True)
    subprocess.run(["git", "config", "user.email", "other@example.com"], cwd=other_dir, check=True, capture_output=True)
    (other_dir / "remote_diverged.txt").write_text("remote diverged", encoding="utf-8")
    subprocess.run(["git", "add", "."], cwd=other_dir, check=True, capture_output=True)
    subprocess.run(["git", "commit", "-m", "Remote diverged commit"], cwd=other_dir, check=True, capture_output=True)
    subprocess.run(["git", "push", "origin", "main"], cwd=other_dir, check=True, capture_output=True)

    # Local repo creates independent local commit
    (local_dir / "local_diverged.txt").write_text("local diverged", encoding="utf-8")
    subprocess.run(["git", "add", "."], cwd=local_dir, check=True, capture_output=True)
    subprocess.run(["git", "commit", "-m", "Local diverged commit"], cwd=local_dir, check=True, capture_output=True)

    git_srv = GitService(repo_path=local_dir)
    state = git_srv.analyze_repository()

    assert state.status == RepositoryStatus.DIVERGED
    assert state.is_safe is False
    assert state.ahead == 1
    assert state.behind == 1

    # Attempting push on diverged repository must raise RepositoryDivergedError without rebase
    with pytest.raises(RepositoryDivergedError):
        git_srv.push_changes()


def test_analyze_repository_dirty_aborts(git_remote_and_local: dict):
    local_dir = git_remote_and_local["local"]
    (local_dir / "uncommitted.txt").write_text("dirty worktree", encoding="utf-8")

    git_srv = GitService(repo_path=local_dir)
    state = git_srv.analyze_repository()

    assert state.status == RepositoryStatus.DIRTY
    assert state.is_safe is False

    with pytest.raises(DirtyWorkingTreeError):
        git_srv.push_changes()


def test_sync_engine_aborts_before_file_writes_on_diverged(git_remote_and_local: dict, tmp_path: Path):
    remote_dir = git_remote_and_local["remote"]
    local_dir = git_remote_and_local["local"]

    # Remote commit
    other_dir = tmp_path / "other-repo"
    subprocess.run(["git", "clone", str(remote_dir), str(other_dir)], check=True, capture_output=True)
    subprocess.run(["git", "config", "user.name", "Other User"], cwd=other_dir, check=True, capture_output=True)
    subprocess.run(["git", "config", "user.email", "other@example.com"], cwd=other_dir, check=True, capture_output=True)
    (other_dir / "remote.txt").write_text("remote content", encoding="utf-8")
    subprocess.run(["git", "add", "."], cwd=other_dir, check=True, capture_output=True)
    subprocess.run(["git", "commit", "-m", "Remote commit"], cwd=other_dir, check=True, capture_output=True)
    subprocess.run(["git", "push", "origin", "main"], cwd=other_dir, check=True, capture_output=True)

    # Local commit
    (local_dir / "local.txt").write_text("local content", encoding="utf-8")
    subprocess.run(["git", "add", "."], cwd=local_dir, check=True, capture_output=True)
    subprocess.run(["git", "commit", "-m", "Local commit"], cwd=local_dir, check=True, capture_output=True)

    sub = Submission(
        id=1,
        title="Two Sum",
        slug="two-sum",
        difficulty="Easy",
        language="python3",
        code="class Solution:\n    def twoSum(self, nums, target):\n        pass",
    )

    engine = SyncEngine(repo_root=local_dir)

    # Must raise RepositoryDivergedError and abort BEFORE writing any solution files to disk
    with pytest.raises(RepositoryDivergedError):
        engine.sync_submission(sub)

    # Assert target problem folder was NOT created on disk
    target_solution_file = local_dir / "Easy" / "0001-two-sum" / "solution.py"
    assert not target_solution_file.exists(), "Filesystem must remain untouched when synchronization aborts due to diverged repository state."
