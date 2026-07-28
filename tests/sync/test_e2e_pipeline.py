"""True end-to-end integration test for full synchronization pipeline."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from server.services.git_service import GitService
from server.schemas import Submission
from server.sync.sync_engine import SyncEngine



def test_end_to_end_synchronization_pipeline(tmp_path: Path):
    # 1. Initialize temporary Git repository
    repo_dir = tmp_path / "leetcode-sync-repo"
    repo_dir.mkdir()

    subprocess.run(["git", "init"], cwd=repo_dir, check=True, capture_output=True)
    subprocess.run(["git", "config", "user.name", "Test User"], cwd=repo_dir, check=True, capture_output=True)
    subprocess.run(["git", "config", "user.email", "test@example.com"], cwd=repo_dir, check=True, capture_output=True)

    # Initial commit so HEAD is not unborn
    readme_path = repo_dir / "README.md"
    readme_path.write_text("# LeetCode Auto Sync Repository\n", encoding="utf-8")
    subprocess.run(["git", "add", "."], cwd=repo_dir, check=True, capture_output=True)
    subprocess.run(["git", "commit", "-m", "Initial commit"], cwd=repo_dir, check=True, capture_output=True)

    # 2. Configure GitService with auto_push disabled for local E2E test
    git_srv = GitService(repo_path=repo_dir, auto_push=False)
    engine = SyncEngine(repo_root=repo_dir, git_service=git_srv)

    # 3. Create mock accepted submission schema
    submission = Submission(
        id=1,
        title="Two Sum",
        slug="two-sum",
        difficulty="Easy",
        language="cpp",
        code="#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        return {0, 1};\n    }\n};",
        trace_id="7d59f2d3-1234-4567-890a-bcdef0123456",
    )

    # 4. Execute complete end-to-end synchronization pipeline
    result = engine.sync_submission(submission)

    assert result["status"] in ("created", "updated", "sync_completed", "ok", "changes_committed")

    # 5. Verify Filesystem Solution File
    solution_files = list(repo_dir.glob("**/solution.cpp"))
    assert len(solution_files) == 1, f"Expected 1 solution.cpp file, found {len(solution_files)}"
    solution_content = solution_files[0].read_text(encoding="utf-8")
    assert "class Solution" in solution_content
    assert "return {0, 1};" in solution_content

    # 6. Verify Problem README.md
    readme_files = list(repo_dir.glob("**/0001-*/README.md"))
    assert len(readme_files) == 1, f"Expected 1 problem README file, found {len(readme_files)}"
    readme_content = readme_files[0].read_text(encoding="utf-8")
    assert "Two Sum" in readme_content
    assert "```cpp" in readme_content

    # 7. Verify Root README.md index updated
    root_readme = repo_dir / "README.md"
    assert root_readme.exists()
    root_content = root_readme.read_text(encoding="utf-8")
    assert "Two Sum" in root_content

    # 8. Verify Git Commit History contains Trace ID
    commit_log = subprocess.run(["git", "log", "-n", "1"], cwd=repo_dir, check=True, capture_output=True, text=True).stdout
    assert "Add 0001 - Two Sum" in commit_log or "Update 0001 - Two Sum" in commit_log
    assert "Trace: 7d59f2d3" in commit_log


def test_consecutive_submissions_end_to_end(tmp_path: Path):
    # Setup repo
    repo_dir = tmp_path / "leetcode-sync-consecutive"
    repo_dir.mkdir()

    subprocess.run(["git", "init"], cwd=repo_dir, check=True, capture_output=True)
    subprocess.run(["git", "config", "user.name", "Test User"], cwd=repo_dir, check=True, capture_output=True)
    subprocess.run(["git", "config", "user.email", "test@example.com"], cwd=repo_dir, check=True, capture_output=True)

    readme_path = repo_dir / "README.md"
    readme_path.write_text("# LeetCode Auto Sync Repository\n", encoding="utf-8")
    subprocess.run(["git", "add", "."], cwd=repo_dir, check=True, capture_output=True)
    subprocess.run(["git", "commit", "-m", "Initial commit"], cwd=repo_dir, check=True, capture_output=True)

    git_srv = GitService(repo_path=repo_dir, auto_push=False)
    engine = SyncEngine(repo_root=repo_dir, git_service=git_srv)

    # Submission 1: Problem A (Add Two Numbers)
    sub_a = Submission(
        id=2,
        title="Add Two Numbers",
        slug="add-two-numbers",
        difficulty="Medium",
        language="python3",
        code="class Solution:\n    def addTwoNumbers(self, l1, l2):\n        pass\n",
        trace_id="SYNC-20260724-aaaaaaaa",
    )
    res_a = engine.sync_submission(sub_a)
    assert res_a["status"] in ("created", "updated")
    assert res_a["trace_id"] == "SYNC-20260724-aaaaaaaa"

    # Submission 2: Problem B (Palindrome Number)
    sub_b = Submission(
        id=9,
        title="Palindrome Number",
        slug="palindrome-number",
        difficulty="Easy",
        language="python3",
        code="class Solution:\n    def isPalindrome(self, x: int) -> bool:\n        return str(x) == str(x)[::-1]\n",
        trace_id="SYNC-20260724-bbbbbbbb",
    )
    res_b = engine.sync_submission(sub_b)
    assert res_b["status"] in ("created", "updated")
    assert res_b["trace_id"] == "SYNC-20260724-bbbbbbbb"

    # Check Git Log has 2 new commits
    commits = subprocess.run(["git", "log", "--oneline"], cwd=repo_dir, check=True, capture_output=True, text=True).stdout.splitlines()
    assert len(commits) >= 3 # Initial commit + Sub A + Sub B
    assert any("Add 0009 - Palindrome Number" in c for c in commits)
    assert any("Add 0002 - Add Two Numbers" in c for c in commits)


