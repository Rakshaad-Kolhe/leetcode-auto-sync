"""Central configuration for the backend foundation."""

from __future__ import annotations

import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent

HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", "8000"))
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
LEETCODE_REPO_PATH = Path(
	os.getenv("LEETCODE_REPO_PATH", str(PROJECT_ROOT / "Leetcode-solutions")),
).expanduser().resolve()
AUTO_PUSH = os.getenv("AUTO_PUSH", "true").strip().lower() in {"1", "true", "yes", "on"}
REMOTE_NAME = os.getenv("REMOTE_NAME", "origin")
DEFAULT_BRANCH = os.getenv("DEFAULT_BRANCH", "main")

# Environment mode ('development' or 'production')
ENV = os.getenv("ENV", "production").strip().lower()

# Comma-separated list of allowed chrome extension IDs for production CORS policy
ALLOWED_EXTENSION_IDS = [
	ext_id.strip()
	for ext_id in os.getenv("ALLOWED_EXTENSION_IDS", "khigfipcgfodpnfeenijjjjggipkibhk").split(",")
	if ext_id.strip()
]
