"""Metrics models and data structures."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass
class MetricsResponse:
    version: str = "1.0.1"
    sync_count: int = 0
    average_sync_ms: float = 0.0
    cache_hit_ratio: float = 0.0
    average_git_commit_ms: float = 0.0
    average_graphql_ms: float = 0.0
    successful_syncs: int = 0
    failed_syncs: int = 0
    last_sync_timestamp: Optional[str] = None
