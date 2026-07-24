"""Custom log formatters for JSON machine readability and human display."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict


class JSONFormatter(logging.Formatter):
    """Format log records as structured JSON payloads."""

    def format(self, record: logging.LogRecord) -> str:
        payload: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "event_name": getattr(record, "event_name", getattr(record, "event", "GENERIC_EVENT")),
            "problem_number": getattr(record, "problem_number", None),
            "problem_slug": getattr(record, "problem_slug", None),
            "duration_ms": getattr(record, "duration_ms", None),
            "status": getattr(record, "status", None),
            "metadata": getattr(record, "metadata", {}),
            "message": record.getMessage(),
        }
        return json.dumps({k: v for k, v in payload.items() if v is not None})


class HumanFormatter(logging.Formatter):
    """Format log records cleanly for terminal output."""

    def format(self, record: logging.LogRecord) -> str:
        event = getattr(record, "event_name", getattr(record, "event", ""))
        msg = record.getMessage()
        if event:
            return f"[{event}] {msg}"
        return f"[{record.levelname}] {msg}"
