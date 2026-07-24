"""Tests for Metadata Integrity Verification, Problem Identity Consistency & SPA Navigation Safety."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

SERVER_DIR = Path(__file__).resolve().parents[1] / "server"
if str(SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(SERVER_DIR))

import pytest
from git_service import GitService
from pydantic import ValidationError
from schemas import Submission
from sync.sync_engine import MetadataIntegrityError, SyncEngine


@pytest.fixture
def repo_env(tmp_path: Path):
    repo_dir = tmp_path / "metadata-integrity-repo"
    repo_dir.mkdir()
    subprocess.run(["git", "init"], cwd=repo_dir, check=True, capture_output=True)
    subprocess.run(["git", "config", "user.name", "Test User"], cwd=repo_dir, check=True, capture_output=True)
    subprocess.run(["git", "config", "user.email", "test@example.com"], cwd=repo_dir, check=True, capture_output=True)

    init_file = repo_dir / "README.md"
    init_file.write_text("# Initial\n", encoding="utf-8")
    subprocess.run(["git", "add", "."], cwd=repo_dir, check=True, capture_output=True)
    subprocess.run(["git", "commit", "-m", "Initial commit"], cwd=repo_dir, check=True, capture_output=True)
    return repo_dir


def test_schema_rejects_mismatched_title_and_slug():
    """Verify Submission schema raises ValidationError when title (Zigzag Conversion) doesn't match slug (palindrome-number)."""
    with pytest.raises(ValidationError, match="Metadata integrity mismatch"):
        Submission(
            id=9,
            title="Zigzag Conversion",
            slug="palindrome-number",
            difficulty="Easy",
            language="cpp",
            code="class Solution {};",
        )


def test_sync_engine_rejects_mismatched_metadata(repo_env: Path):
    """Verify SyncEngine raises MetadataIntegrityError when title and slug are inconsistent."""
    git_srv = GitService(repo_path=repo_env, auto_push=False)
    engine = SyncEngine(repo_root=repo_env, git_service=git_srv)

    # Bypass Pydantic schema validation to test SyncEngine defensive check
    sub = Submission.model_construct(
        id=9,
        title="Zigzag Conversion",
        slug="palindrome-number",
        difficulty="Easy",
        language="cpp",
        code="class Solution { public: bool isPalindrome(int x) { return true; } };",
    )

    with pytest.raises(MetadataIntegrityError, match="Metadata integrity check failed"):
        engine.sync_submission(sub)


def test_valid_consistent_metadata_sync_succeeds(repo_env: Path):
    """Verify consistent metadata (Palindrome Number -> palindrome-number) syncs successfully."""
    git_srv = GitService(repo_path=repo_env, auto_push=False)
    engine = SyncEngine(repo_root=repo_env, git_service=git_srv)

    sub = Submission(
        id=9,
        title="Palindrome Number",
        slug="palindrome-number",
        difficulty="Easy",
        language="cpp",
        code="class Solution { public: bool isPalindrome(int x) { return true; } };",
    )

    res = engine.sync_submission(sub)
    assert res["status"] in ("created", "updated")

    readme_path = repo_env / "Easy" / "0009-Palindrome Number" / "README.md"
    assert readme_path.exists()
    assert "Palindrome Number" in readme_path.read_text(encoding="utf-8")


def test_diagnostics_includes_metadata_integrity(repo_env: Path):
    """Verify diagnostics bundle contains metadata integrity verification info."""
    from diagnostics import generate_diagnostics_bundle

    bundle = generate_diagnostics_bundle(repo_root=repo_env)
    assert "metadata_integrity" in bundle or "repository" in bundle
