"""Unit tests for structured event logging package."""

import json
import logging
import sys
from pathlib import Path

SERVER_DIR = Path(__file__).resolve().parents[1] / "server"
if str(SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(SERVER_DIR))

from app_logging.events import SyncEvent
from app_logging.formatter import HumanFormatter, JSONFormatter
from app_logging.logger import configure_logging, log_event


def test_sync_event_enum_values():
    assert SyncEvent.SYNC_STARTED == "SYNC_STARTED"
    assert SyncEvent.METADATA_FETCH_COMPLETED == "METADATA_FETCH_COMPLETED"
    assert SyncEvent.GIT_COMMIT_CREATED == "GIT_COMMIT_CREATED"


def test_json_formatter_payload():
    formatter = JSONFormatter()
    record = logging.LogRecord(
        name="test_logger",
        level=logging.INFO,
        pathname="test.py",
        lineno=10,
        msg="Test message",
        args=(),
        exc_info=None,
    )
    record.event_name = "SYNC_STARTED"
    record.problem_number = 1
    record.problem_slug = "two-sum"

    formatted = formatter.format(record)
    data = json.loads(formatted)

    assert data["logger"] == "test_logger"
    assert data["event_name"] == "SYNC_STARTED"
    assert data["problem_number"] == 1
    assert data["problem_slug"] == "two-sum"
    assert "timestamp" in data


def test_human_formatter_output():
    formatter = HumanFormatter()
    record = logging.LogRecord(
        name="test_logger",
        level=logging.INFO,
        pathname="test.py",
        lineno=10,
        msg="Sync starting now",
        args=(),
        exc_info=None,
    )
    record.event_name = "SYNC_STARTED"

    formatted = formatter.format(record)
    assert formatted == "[SYNC_STARTED] Sync starting now"


def test_configure_logging():
    configure_logging(json_format=True)
    root_logger = logging.getLogger()
    assert len(root_logger.handlers) == 1
    assert isinstance(root_logger.handlers[0].formatter, JSONFormatter)

    configure_logging(json_format=False)
    assert isinstance(root_logger.handlers[0].formatter, HumanFormatter)
