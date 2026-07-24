"""Tests for backward compatible Submission schema migration and conditional source integrity."""

from __future__ import annotations

import hashlib
import subprocess
import sys
from pathlib import Path

SERVER_DIR = Path(__file__).resolve().parents[1] / "server"
if str(SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(SERVER_DIR))

import pytest
from git_service import GitService
from schemas import Submission
from sync.sync_engine import SourceIntegrityError, SyncEngine


@pytest.fixture
def repo_env(tmp_path: Path):
    repo_dir = tmp_path / "migration-repo"
    repo_dir.mkdir()
    subprocess.run(["git", "init"], cwd=repo_dir, check=True, capture_output=True)
    subprocess.run(["git", "config", "user.name", "Test User"], cwd=repo_dir, check=True, capture_output=True)
    subprocess.run(["git", "config", "user.email", "test@example.com"], cwd=repo_dir, check=True, capture_output=True)

    init_file = repo_dir / "README.md"
    init_file.write_text("# Initial\n", encoding="utf-8")
    subprocess.run(["git", "add", "."], cwd=repo_dir, check=True, capture_output=True)
    subprocess.run(["git", "commit", "-m", "Initial commit"], cwd=repo_dir, check=True, capture_output=True)
    return repo_dir


def test_legacy_submission_instantiation_without_optional_fields():
    """Verify legacy Submission instantiation without source_hash, line_count, or char_count."""
    sub = Submission(
        id=1,
        title="Two Sum",
        slug="two-sum",
        difficulty="Easy",
        language="cpp",
        code="class Solution { public: int test() { return 1; } };",
    )
    assert getattr(sub, "source_hash", None) is None
    assert getattr(sub, "line_count", None) is None
    assert getattr(sub, "char_count", None) is None


def test_legacy_submission_sync_succeeds_and_skips_hash_check(repo_env: Path):
    """Verify legacy Submission payload synchronizes without AttributeError."""
    git_srv = GitService(repo_path=repo_env, auto_push=False)
    engine = SyncEngine(repo_root=repo_env, git_service=git_srv)

    legacy_sub = Submission(
        id=10,
        title="Regular Expression Matching",
        slug="regular-expression-matching",
        difficulty="Hard",
        language="cpp",
        code="class Solution { public: bool isMatch(string s, string p) { return true; } };",
    )

    res = engine.sync_submission(legacy_sub)
    assert res["status"] in ("created", "updated", "sync_completed", "ok")

    sol_files = list(repo_env.glob("**/solution.cpp"))
    assert len(sol_files) == 1
    assert "class Solution" in sol_files[0].read_text(encoding="utf-8")


def test_modern_submission_sync_executes_integrity_check(repo_env: Path):
    """Verify modern Submission with source_hash validates SHA-256 and succeeds."""
    git_srv = GitService(repo_path=repo_env, auto_push=False)
    engine = SyncEngine(repo_root=repo_env, git_service=git_srv)

    code = "class Solution { public: int reverse(int x) { return 0; } };"
    valid_hash = hashlib.sha256(code.encode("utf-8")).hexdigest()

    modern_sub = Submission(
        id=7,
        title="Reverse Integer",
        slug="reverse-integer",
        difficulty="Medium",
        language="cpp",
        code=code,
        source_hash=valid_hash,
        line_count=1,
        char_count=len(code),
        trace_id="tr_123456789",
    )

    res = engine.sync_submission(modern_sub)
    assert res["status"] in ("created", "updated", "sync_completed", "ok")


def test_modern_submission_with_invalid_hash_raises_source_integrity_error(repo_env: Path):
    """Verify modern Submission with mismatched source_hash raises SourceIntegrityError."""
    git_srv = GitService(repo_path=repo_env, auto_push=False)
    engine = SyncEngine(repo_root=repo_env, git_service=git_srv)

    code = "class Solution { public: int reverse(int x) { return 0; } };"
    invalid_hash = "1111111111111111111111111111111111111111111111111111111111111111"

    modern_sub = Submission(
        id=7,
        title="Reverse Integer",
        slug="reverse-integer",
        difficulty="Medium",
        language="cpp",
        code=code,
        source_hash=invalid_hash,
    )

    with pytest.raises(SourceIntegrityError, match="Source integrity SHA-256 verification failed"):
        engine.sync_submission(modern_sub)
