"""Structured logging helper functions and logger initialization."""

from __future__ import annotations

import logging
import sys
from typing import Any, Dict, Optional

from .formatter import HumanFormatter, JSONFormatter


def configure_logging(json_format: bool = False, level: int = logging.INFO) -> None:
    """Configure root logger with structured JSON or Human formatter."""
    root_logger = logging.getLogger()
    root_logger.setLevel(level)

    for handler in list(root_logger.handlers):
        root_logger.removeHandler(handler)

    handler = logging.StreamHandler(sys.stdout)
    if json_format:
        handler.setFormatter(JSONFormatter())
    else:
        handler.setFormatter(HumanFormatter())

    root_logger.addHandler(handler)


def log_event(
    logger: logging.Logger,
    event_name: str,
    message: str = "",
    problem_number: Optional[int] = None,
    problem_slug: Optional[str] = None,
    duration_ms: Optional[float] = None,
    status: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    level: int = logging.INFO,
) -> None:
    """Helper to emit structured log events."""
    extra = {
        "event_name": event_name,
        "problem_number": problem_number,
        "problem_slug": problem_slug,
        "duration_ms": duration_ms,
        "status": status,
        "metadata": metadata or {},
    }
    logger.log(level, message or f"[{event_name}]", extra=extra)
