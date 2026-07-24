"""Unit tests for MetricsCollector and telemetry summary."""

import sys
from pathlib import Path

SERVER_DIR = Path(__file__).resolve().parents[1] / "server"
if str(SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(SERVER_DIR))

from metrics import MetricsCollector


def test_metrics_collector_counters():
    collector = MetricsCollector()
    start_time = collector.record_sync_start()
    collector.record_cache_hit()
    collector.record_cache_miss()
    collector.record_sync_complete(start_time, success=True)

    summary = collector.get_summary()
    assert summary["total_syncs"] == 1
    assert summary["successful_syncs"] == 1
    assert summary["failed_syncs"] == 0
    assert summary["cache_hits"] == 1
    assert summary["cache_misses"] == 1
    assert summary["cache_hit_ratio"] == 0.5


def test_metrics_collector_durations():
    collector = MetricsCollector()
    collector.record_metadata_duration(10.5)
    collector.record_readme_duration(5.0)
    collector.record_git_stage_duration(2.0)
    collector.record_git_commit_duration(15.0)
    collector.record_git_push_duration(50.0)

    summary = collector.get_summary()
    assert summary["metadata_fetch_avg_ms"] == 10.5
    assert summary["readme_gen_avg_ms"] == 5.0
    assert summary["git_stage_avg_ms"] == 2.0
    assert summary["git_commit_avg_ms"] == 15.0
    assert summary["git_push_avg_ms"] == 50.0
