"""Unit tests for release packaging and diagnostics redaction."""

import sys
from pathlib import Path

SERVER_DIR = Path(__file__).resolve().parents[1] / "server"
if str(SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(SERVER_DIR))

from diagnostics import generate_diagnostics_bundle, sanitize_config


def test_sanitize_config_masks_sensitive_tokens():
    raw_config = {
        "repository": {"repo_path": "/home/user/repo"},
        "github": {"access_token": "secret_token_123", "password": "my_password"},
        "metadata": {"api_key": "abc123secret"},
    }

    sanitized = sanitize_config(raw_config)
    assert sanitized["repository"]["repo_path"] == "/home/user/repo"
    assert sanitized["github"]["access_token"] == "***REDACTED***"
    assert sanitized["github"]["password"] == "***REDACTED***"
    assert sanitized["metadata"]["api_key"] == "***REDACTED***"


def test_generate_diagnostics_bundle(tmp_path: Path):
    git_dir = tmp_path / ".git"
    git_dir.mkdir()

    bundle = generate_diagnostics_bundle(tmp_path)
    assert bundle["service"] == "leetcode-auto-sync"
    assert bundle["version"] == "1.0.0"
    assert "environment" in bundle
    assert "configuration" in bundle
