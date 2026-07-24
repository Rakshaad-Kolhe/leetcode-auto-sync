"""Benchmark suite measuring performance across 100, 500, and 1000 submissions."""

from __future__ import annotations

import sys
import tempfile
import time
from pathlib import Path
from unittest.mock import MagicMock

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SERVER_DIR = PROJECT_ROOT / "server"
if str(SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(SERVER_DIR))

from schemas import Submission
from sync.sync_engine import SyncEngine


def benchmark_sync_batch(count: int = 100) -> dict[str, float]:
    """Run cold and warm synchronization benchmark for a specific batch count."""
    with tempfile.TemporaryDirectory() as tmp:
        repo_root = Path(tmp)
        (repo_root / ".git").mkdir()

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
            repo_root=repo_root,
            git_service=mock_git,
            metadata_service=mock_metadata,
        )

        submissions = [
            Submission(
                id=i,
                title=f"Problem {i}",
                slug=f"problem-{i}",
                difficulty="Easy" if i % 2 == 0 else "Medium",
                language="cpp",
                code=f"// Solution {i}\nint main() {{ return 0; }}",
            )
            for i in range(1, count + 1)
        ]

        # 1. Cold cache sync
        t0 = time.perf_counter()
        for sub in submissions:
            engine.sync_submission(sub)
        t1 = time.perf_counter()
        cold_total_sec = t1 - t0

        # 2. Warm cache (idempotency) sync
        mock_git.get_status.return_value = {"clean": True, "files": []}
        t2 = time.perf_counter()
        for sub in submissions:
            engine.sync_submission(sub)
        t3 = time.perf_counter()
        warm_total_sec = t3 - t2

        return {
            "count": float(count),
            "cold_total_sec": round(cold_total_sec, 3),
            "cold_avg_ms": round((cold_total_sec / count) * 1000, 2),
            "warm_total_sec": round(warm_total_sec, 3),
            "warm_avg_ms": round((warm_total_sec / count) * 1000, 2),
            "throughput_warm_sec": round(count / warm_total_sec if warm_total_sec > 0 else 0, 1),
        }


def run_full_benchmark_suite() -> dict[int, dict[str, float]]:
    print("==================================================")
    print("    LeetCode Auto Sync Performance Benchmarks     ")
    print("==================================================")
    results = {}
    for batch in [100, 500, 1000]:
        print(f"Running benchmark for {batch} submissions...")
        res = benchmark_sync_batch(batch)
        results[batch] = res
        print(
            f"[{batch} Submissions] Cold: {res['cold_total_sec']}s ({res['cold_avg_ms']} ms/sub) | "
            f"Warm: {res['warm_total_sec']}s ({res['warm_avg_ms']} ms/sub) | Throughput: {res['throughput_warm_sec']} syncs/sec"
        )
    return results


if __name__ == "__main__":
    run_full_benchmark_suite()
