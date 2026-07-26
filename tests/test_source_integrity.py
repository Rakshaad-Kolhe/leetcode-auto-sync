"""Integration and unit tests for Source Integrity Verification, SHA-256 hashing, and complete code preservation."""

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
    repo_dir = tmp_path / "integrity-repo"
    repo_dir.mkdir()
    subprocess.run(["git", "init"], cwd=repo_dir, check=True, capture_output=True)
    subprocess.run(["git", "config", "user.name", "Test User"], cwd=repo_dir, check=True, capture_output=True)
    subprocess.run(["git", "config", "user.email", "test@example.com"], cwd=repo_dir, check=True, capture_output=True)

    init_file = repo_dir / "README.md"
    init_file.write_text("# Initial\n", encoding="utf-8")
    subprocess.run(["git", "add", "."], cwd=repo_dir, check=True, capture_output=True)
    subprocess.run(["git", "commit", "-m", "Initial commit"], cwd=repo_dir, check=True, capture_output=True)
    return repo_dir


def test_source_integrity_preserves_sha256_hash(repo_env: Path):
    git_srv = GitService(repo_path=repo_env, auto_push=False)
    engine = SyncEngine(repo_root=repo_env, git_service=git_srv)

    code = "#include <iostream>\nusing namespace std;\nclass Solution {\npublic:\n    int test() { return 42; }\n};\n"
    computed_hash = hashlib.sha256(code.encode("utf-8")).hexdigest()

    submission = Submission(
        id=1,
        title="Two Sum",
        slug="two-sum",
        difficulty="Easy",
        language="cpp",
        code=code,
        source_hash=computed_hash,
        line_count=len(code.splitlines()),
        char_count=len(code),
        trace_id="7d59f2d3-1234-4567-890a-bcdef0123456",
    )

    res = engine.sync_submission(submission)
    assert res["status"] in ("created", "updated", "sync_completed", "ok")

    sol_files = list(repo_env.glob("**/solution.cpp"))
    assert len(sol_files) == 1
    file_code = sol_files[0].read_text(encoding="utf-8")
    assert hashlib.sha256(file_code.encode("utf-8")).hexdigest() == computed_hash


def test_source_integrity_rejects_mismatched_sha256_payload(repo_env: Path):
    git_srv = GitService(repo_path=repo_env, auto_push=False)
    engine = SyncEngine(repo_root=repo_env, git_service=git_srv)

    code = "class Solution {\npublic:\n    int test() { return 42; }\n};\n"
    invalid_hash = "0000000000000000000000000000000000000000000000000000000000000000"

    submission = Submission(
        id=2,
        title="Add Two Numbers",
        slug="add-two-numbers",
        difficulty="Medium",
        language="cpp",
        code=code,
        source_hash=invalid_hash,
    )

    with pytest.raises(SourceIntegrityError, match="Source integrity SHA-256 verification failed"):
        engine.sync_submission(submission)


def test_source_integrity_large_500_plus_lines_solution(repo_env: Path):
    git_srv = GitService(repo_path=repo_env, auto_push=False)
    engine = SyncEngine(repo_root=repo_env, git_service=git_srv)

    # Construct 550 line C++ solution with helper classes and template functions
    lines = ["#include <vector>", "#include <iostream>", "using namespace std;", "", "template<typename T>", "class Helper {", "public:", "    T val;"]
    for i in range(500):
        lines.append(f"    int helper_func_{i}() {{ return {i}; }}")
    lines.extend(["};", "", "class Solution {", "public:", "    int solve() { return 0; }", "};"])

    large_code = "\n".join(lines)
    computed_hash = hashlib.sha256(large_code.encode("utf-8")).hexdigest()

    submission = Submission(
        id=4,
        title="Median of Two Sorted Arrays",
        slug="median-of-two-sorted-arrays",
        difficulty="Hard",
        language="cpp",
        code=large_code,
        source_hash=computed_hash,
        line_count=len(lines),
        char_count=len(large_code),
    )

    res = engine.sync_submission(submission)
    assert res["status"] in ("created", "updated", "sync_completed", "ok")

    sol_files = list(repo_env.glob("**/solution.cpp"))
    assert len(sol_files) == 1
    file_code = sol_files[0].read_text(encoding="utf-8")
    assert len(file_code.splitlines()) == len(lines)
    assert hashlib.sha256(file_code.encode("utf-8")).hexdigest() == computed_hash
