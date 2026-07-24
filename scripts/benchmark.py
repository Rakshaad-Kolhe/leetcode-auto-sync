"""Benchmark suite measuring synchronization throughput and idempotency performance."""

from __future__ import annotations

import sys
import tempfile
import time
from pathlib import Path
from unittest.mock import MagicMock

SERVER_DIR = Path(__file__).resolve().parents[1] / "server"
if str(SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(SERVER_DIR))

from schemas import Submission
from sync.sync_engine import SyncEngine


def run_benchmark(iterations: int = 50) -> dict[str, float]:
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
            for i in range(1, iterations + 1)
        ]

        # 1. Cold sync benchmark
        t_cold_start = time.perf_counter()
        for sub in submissions:
            engine.sync_submission(sub)
        t_cold_end = time.perf_counter()
        cold_total_s = t_cold_end - t_cold_start
        cold_avg_ms = (cold_total_s / iterations) * 1000

        # 2. Warm sync (idempotency fast-path) benchmark
        mock_git.get_status.return_value = {"clean": True, "files": []}
        t_warm_start = time.perf_counter()
        for sub in submissions:
            engine.sync_submission(sub)
        t_warm_end = time.perf_counter()
        warm_total_s = t_warm_end - t_warm_start
        warm_avg_ms = (warm_total_s / iterations) * 1000

        results = {
            "iterations": float(iterations),
            "cold_total_sec": round(cold_total_s, 3),
            "cold_avg_ms": round(cold_avg_ms, 3),
            "warm_total_sec": round(warm_total_s, 3),
            "warm_avg_ms": round(warm_avg_ms, 3),
            "throughput_syncs_per_sec": round(iterations / warm_total_s, 2),
        }

        print("=== Benchmark Results ===")
        print(f"Submissions: {iterations}")
        print(f"Cold Sync Total: {results['cold_total_sec']}s ({results['cold_avg_ms']} ms/sub)")
        print(f"Warm Sync Total: {results['warm_total_sec']}s ({results['warm_avg_ms']} ms/sub)")
        print(f"Throughput: {results['throughput_syncs_per_sec']} syncs/sec")
        return results


if __name__ == "__main__":
    count = int(sys.argv[1]) if len(sys.argv) > 1 else 50
    run_benchmark(count)
