"""Unit tests for retry_with_backoff decorator."""

import sys
from pathlib import Path
from unittest.mock import MagicMock

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import pytest
from server.retry import retry_with_backoff


def test_retry_with_backoff_success_first_try():
    mock_fn = MagicMock(return_value="success")
    decorated = retry_with_backoff(max_retries=3, initial_delay=0.01)(mock_fn)

    assert decorated() == "success"
    assert mock_fn.call_count == 1


def test_retry_with_backoff_success_after_retry():
    mock_fn = MagicMock(side_effect=[ValueError("fail 1"), "success"])
    decorated = retry_with_backoff(max_retries=3, initial_delay=0.01, exceptions=(ValueError,))(mock_fn)

    assert decorated() == "success"
    assert mock_fn.call_count == 2


def test_retry_with_backoff_exceeds_max_retries():
    mock_fn = MagicMock(side_effect=ValueError("persistent failure"))
    decorated = retry_with_backoff(max_retries=3, initial_delay=0.01, exceptions=(ValueError,))(mock_fn)

    with pytest.raises(ValueError, match="persistent failure"):
        decorated()
    assert mock_fn.call_count == 3
