"""Legacy compatibility wrapper for metrics collector package."""

from metrics.collector import MetricsCollector
from metrics.models import MetricsResponse

__all__ = ["MetricsCollector", "MetricsResponse"]
