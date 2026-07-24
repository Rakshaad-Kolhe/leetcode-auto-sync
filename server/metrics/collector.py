"""Thread-safe singleton metrics collector for runtime telemetry."""

from __future__ import annotations

import logging
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class MetricsCollector:
    """Singleton metrics collector recording runtime statistics."""

    _instance: Optional[MetricsCollector] = None

    def __init__(self) -> None:
        self.version = "1.0.1"
        self.sync_count = 0
        self.successful_syncs = 0
        self.failed_syncs = 0
        self.cache_hits = 0
        self.cache_misses = 0

        self.sync_durations: List[float] = []
        self.graphql_durations: List[float] = []
        self.readme_durations: List[float] = []
        self.git_stage_durations: List[float] = []
        self.git_commit_durations: List[float] = []
        self.git_push_durations: List[float] = []

        self.last_sync_timestamp: Optional[str] = None

    @classmethod
    def get_instance(cls) -> MetricsCollector:
        if cls._instance is None:
            cls._instance = MetricsCollector()
        return cls._instance

    @classmethod
    def reset_instance(cls) -> None:
        cls._instance = None

    def record_sync_start(self) -> float:
        self.sync_count += 1
        return time.perf_counter()

    def record_sync_complete(self, start_time: float, success: bool = True) -> None:
        duration_ms = (time.perf_counter() - start_time) * 1000
        self.sync_durations.append(duration_ms)
        self.last_sync_timestamp = datetime.now(timezone.utc).isoformat()
        if success:
            self.successful_syncs += 1
        else:
            self.failed_syncs += 1

    def record_cache_hit(self) -> None:
        self.cache_hits += 1

    def record_cache_miss(self) -> None:
        self.cache_misses += 1

    def record_graphql_duration(self, duration_ms: float) -> None:
        self.graphql_durations.append(duration_ms)

    def record_metadata_duration(self, duration_ms: float) -> None:
        self.record_graphql_duration(duration_ms)

    def record_readme_duration(self, duration_ms: float) -> None:
        self.readme_durations.append(duration_ms)

    def record_git_stage_duration(self, duration_ms: float) -> None:
        self.git_stage_durations.append(duration_ms)

    def record_git_commit_duration(self, duration_ms: float) -> None:
        self.git_commit_durations.append(duration_ms)

    def record_git_push_duration(self, duration_ms: float) -> None:
        self.git_push_durations.append(duration_ms)

    def get_summary(self) -> Dict[str, Any]:
        total_cache = self.cache_hits + self.cache_misses
        hit_ratio = round(self.cache_hits / total_cache, 4) if total_cache > 0 else 0.0

        def _avg(lst: List[float]) -> float:
            return round(sum(lst) / len(lst), 2) if lst else 0.0

        return {
            "version": self.version,
            "sync_count": self.sync_count,
            "total_syncs": self.sync_count,
            "successful_syncs": self.successful_syncs,
            "failed_syncs": self.failed_syncs,
            "average_sync_ms": _avg(self.sync_durations),
            "avg_sync_duration_ms": _avg(self.sync_durations),
            "cache_hits": self.cache_hits,
            "cache_misses": self.cache_misses,
            "cache_hit_ratio": hit_ratio,
            "average_graphql_ms": _avg(self.graphql_durations),
            "average_git_commit_ms": _avg(self.git_commit_durations),
            "metadata_fetch_avg_ms": _avg(self.graphql_durations),
            "readme_gen_avg_ms": _avg(self.readme_durations),
            "git_stage_avg_ms": _avg(self.git_stage_durations),
            "git_commit_avg_ms": _avg(self.git_commit_durations),
            "git_push_avg_ms": _avg(self.git_push_durations),
            "last_sync_timestamp": self.last_sync_timestamp,
        }
