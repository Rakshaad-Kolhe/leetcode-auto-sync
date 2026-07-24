"""Unit tests for benchmark suite execution."""

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SCRIPTS_DIR = PROJECT_ROOT / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from benchmark import run_benchmark


def test_run_benchmark_small_batch():
    results = run_benchmark(iterations=5)
    assert results["iterations"] == 5.0
    assert results["cold_total_sec"] > 0
    assert results["warm_total_sec"] > 0
    assert "throughput_syncs_per_sec" in results
