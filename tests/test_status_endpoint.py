"""Unit tests for status, health, and diagnostics API endpoints."""

import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

SERVER_DIR = Path(__file__).resolve().parents[1] / "server"
if str(SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(SERVER_DIR))

from fastapi.testclient import TestClient
from app import app


client = TestClient(app)


def test_get_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "running"
    assert data["version"] == "1.0.0"


def test_get_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


def test_get_status_endpoint():
    response = client.get("/status")
    assert response.status_code == 200
    data = response.json()
    assert "server" in data
    assert "git" in data
    assert "repository" in data
    assert "version" in data


def test_get_diagnostics_endpoint():
    response = client.get("/diagnostics")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "leetcode-auto-sync"
    assert "environment" in data
    assert "configuration" in data


def test_setup_wizard_endpoint(tmp_path: Path):
    git_dir = tmp_path / ".git"
    git_dir.mkdir()

    payload = {"repository_path": str(tmp_path)}
    response = client.post("/setup", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "setup_completed"
