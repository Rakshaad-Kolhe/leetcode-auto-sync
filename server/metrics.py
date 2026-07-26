"""Legacy compatibility wrapper for metrics collector package."""

from server.metrics.collector import MetricsCollector
from server.metrics.models import MetricsResponse

__all__ = ["MetricsCollector", "MetricsResponse"]
