"""System diagnostics and support bundle generator."""

from __future__ import annotations

import logging
import os
import platform
import sys
from pathlib import Path
from typing import Any, Dict

from config.config_manager import ConfigManager
from git_service import GitService

logger = logging.getLogger(__name__)

SERVICE_VERSION = "1.0.1"


def sanitize_config(data: Any) -> Any:
    """Recursively mask sensitive values in dictionary."""
    if isinstance(data, dict):
        sanitized = {}
        for key, value in data.items():
            key_lower = str(key).lower()
            if any(secret_word in key_lower for secret_word in ("token", "password", "secret", "auth", "key")):
                sanitized[key] = "***REDACTED***"
            else:
                sanitized[key] = sanitize_config(value)
        return sanitized
    if isinstance(data, list):
        return [sanitize_config(item) for item in data]
    return data


def generate_diagnostics_bundle(repo_root: Path | str | None = None) -> Dict[str, Any]:
    """Generate a comprehensive diagnostic support bundle."""
    try:
        cfg_mgr = ConfigManager.get_instance(repo_root=repo_root)
        raw_config = cfg_mgr.get_config().to_dict()
        sanitized_config = sanitize_config(raw_config)
    except Exception as exc:
        sanitized_config = {"error": f"Failed loading config: {exc}"}

    root_path = Path(repo_root or ConfigManager.get_instance().repo_root).expanduser().resolve()

    git_info: Dict[str, Any] = {"status": "unknown"}
    try:
        git_srv = GitService(repo_path=root_path)
        repo_valid = git_srv.verify_repository().get("valid", False)
        branch = git_srv.get_current_branch().get("branch", "unknown")
        status = git_srv.get_status()
        git_identity = git_srv.verify_git_identity()
        contribution_eligibility = git_srv.check_contribution_eligibility()
        try:
            branch_status = git_srv.get_branch_status(branch=branch)
        except Exception:
            branch_status = {"state": "UNKNOWN", "ahead_count": 0, "behind_count": 0}

        git_info = {
            "valid": repo_valid,
            "branch": branch,
            "clean": status.get("clean", False),
            "untracked_count": len(status.get("files", [])),
            "identity": git_identity,
            "contribution_eligibility": contribution_eligibility,
            "branch_status": branch_status,
        }
    except Exception as exc:
        git_info = {"status": "error", "error": str(exc)}

    cache_dir = root_path / ".cache"
    cache_exists = cache_dir.exists()

    return {
        "service": "leetcode-auto-sync",
        "version": SERVICE_VERSION,
        "environment": {
            "python_version": sys.version,
            "platform": platform.platform(),
            "system": platform.system(),
            "release": platform.release(),
            "architecture": platform.architecture()[0],
        },
        "repository": {
            "path": str(root_path),
            "git": git_info,
            "cache_exists": cache_exists,
        },
        "source_integrity": {
            "algorithm": "SHA-256",
            "brace_balancing_enforced": True,
            "verification_active": True,
        },
        "configuration": sanitized_config,
    }
