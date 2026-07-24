"""Integration tests for Git push reliability, branch divergence recovery, and error hierarchy."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

SERVER_DIR = Path(__file__).resolve().parents[1] / "server"
if str(SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(SERVER_DIR))

import pytest
from git_service import (
    GitService,
    GitNotInstalledError,
    InvalidRepositoryError,
    DetachedHeadError,
    PushFailedError,
    CommitFailedError,
    MissingRemoteError,
    RemoteAheadError,
    BranchDivergedError,
    MergeConflictError,
    AuthenticationError,
)


@pytest.fixture
def git_remote_and_local(tmp_path: Path):
    """Fixture creating bare remote and cloned local repository."""
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


def test_git_push_reliability_ahead_only(git_remote_and_local: dict):
    local_dir = git_remote_and_local["local"]
    git_srv = GitService(repo_path=local_dir, auto_push=True, auto_rebase=True)

    (local_dir / "test.txt").write_text("Hello", encoding="utf-8")
    git_srv.stage_changes()
    git_srv.commit_changes("Add test.txt")

    status = git_srv.get_branch_status(branch="main")
    assert status["state"] == "AHEAD_ONLY"
    assert status["ahead_count"] == 1
    assert status["behind_count"] == 0

    push_res = git_srv.push_changes("main")
    assert push_res["pushed"] is True
    assert push_res["local_head"] == push_res["remote_head"]


def test_git_push_reliability_remote_ahead_auto_rebase(git_remote_and_local: dict, tmp_path: Path):
    remote_dir = git_remote_and_local["remote"]
    local_dir = git_remote_and_local["local"]

    other_dir = tmp_path / "other-local"
    subprocess.run(["git", "clone", str(remote_dir), str(other_dir)], check=True, capture_output=True)
    subprocess.run(["git", "config", "user.name", "Other User"], cwd=other_dir, check=True, capture_output=True)
    subprocess.run(["git", "config", "user.email", "other@example.com"], cwd=other_dir, check=True, capture_output=True)
    subprocess.run(["git", "checkout", "main"], cwd=other_dir, check=True, capture_output=True)

    (other_dir / "remote_change.txt").write_text("Remote edit", encoding="utf-8")
    subprocess.run(["git", "add", "."], cwd=other_dir, check=True, capture_output=True)
    subprocess.run(["git", "commit", "-m", "Remote commit"], cwd=other_dir, check=True, capture_output=True)
    subprocess.run(["git", "push", "origin", "main"], cwd=other_dir, check=True, capture_output=True)

    (local_dir / "local_change.txt").write_text("Local edit", encoding="utf-8")
    subprocess.run(["git", "add", "."], cwd=local_dir, check=True, capture_output=True)
    subprocess.run(["git", "commit", "-m", "Local commit"], cwd=local_dir, check=True, capture_output=True)

    git_srv = GitService(repo_path=local_dir, auto_push=True, auto_rebase=True)

    push_res = git_srv.push_changes("main")
    assert push_res["pushed"] is True
    assert (local_dir / "remote_change.txt").exists()
    assert (local_dir / "local_change.txt").exists()


def test_git_push_reliability_branch_diverged_raises_without_auto_rebase(git_remote_and_local: dict, tmp_path: Path):
    remote_dir = git_remote_and_local["remote"]
    local_dir = git_remote_and_local["local"]

    other_dir = tmp_path / "other-local"
    subprocess.run(["git", "clone", str(remote_dir), str(other_dir)], check=True, capture_output=True)
    subprocess.run(["git", "config", "user.name", "Other User"], cwd=other_dir, check=True, capture_output=True)
    subprocess.run(["git", "config", "user.email", "other@example.com"], cwd=other_dir, check=True, capture_output=True)
    subprocess.run(["git", "checkout", "main"], cwd=other_dir, check=True, capture_output=True)

    (other_dir / "remote_change.txt").write_text("Remote edit", encoding="utf-8")
    subprocess.run(["git", "add", "."], cwd=other_dir, check=True, capture_output=True)
    subprocess.run(["git", "commit", "-m", "Remote commit"], cwd=other_dir, check=True, capture_output=True)
    subprocess.run(["git", "push", "origin", "main"], cwd=other_dir, check=True, capture_output=True)

    (local_dir / "local_change.txt").write_text("Local edit", encoding="utf-8")
    subprocess.run(["git", "add", "."], cwd=local_dir, check=True, capture_output=True)
    subprocess.run(["git", "commit", "-m", "Local commit"], cwd=local_dir, check=True, capture_output=True)

    git_srv = GitService(repo_path=local_dir, auto_push=True, auto_rebase=False)

    with pytest.raises((BranchDivergedError, RemoteAheadError, PushFailedError)):
        git_srv.push_changes("main")
