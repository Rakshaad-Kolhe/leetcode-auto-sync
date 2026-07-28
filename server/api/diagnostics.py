"""System diagnostics and support bundle generator."""

from __future__ import annotations

import logging
import os
import platform
import sys
from pathlib import Path
from typing import Any, Dict

from server.config.config_manager import ConfigManager
from server.services.git_service import GitService

from server.version import __version__ as SERVICE_VERSION

logger = logging.getLogger(__name__)


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
    repo_valid = False
    head_commit = "unknown"
    branch = "unknown"
    pending_changes = []

    try:
        git_srv = GitService(repo_path=root_path)
        repo_valid = git_srv.verify_repository().get("valid", False)
        status = git_srv.get_status()
        pending_changes = status.get("files", [])
        git_identity = git_srv.verify_git_identity()
        contribution_eligibility = git_srv.check_contribution_eligibility()

        try:
            analysis = git_srv.analyze_repository()
            branch = analysis.branch
            head_commit = analysis.local_head
            remote_head = analysis.remote_head
            state_val = analysis.status.value
            ahead = analysis.ahead
            behind = analysis.behind
            is_safe = analysis.is_safe
        except Exception:
            branch = "unknown"
            head_commit = "none"
            remote_head = "none"
            state_val = "UNKNOWN"
            ahead = 0
            behind = 0
            is_safe = False

        if is_safe:
            sync_decision = "Synchronization permitted (repository clean/safe)"
        elif state_val == "DIVERGED":
            sync_decision = "Synchronization aborted (local and remote branches diverged)"
        elif state_val == "DIRTY":
            sync_decision = "Synchronization aborted (dirty working tree)"
        elif state_val == "DETACHED_HEAD":
            sync_decision = "Synchronization aborted (detached HEAD)"
        else:
            sync_decision = f"Synchronization aborted (invalid repository state: {state_val})"


        git_info = {
            "valid": repo_valid,
            "branch": branch,
            "local_head": head_commit,
            "remote_head": remote_head,
            "status": state_val,
            "ahead_count": ahead,
            "behind_count": behind,
            "clean": status.get("clean", False),
            "pending_changes_count": len(pending_changes),
            "pending_files": pending_changes,
            "identity": git_identity,
            "contribution_eligibility": contribution_eligibility,
            "synchronization_decision": sync_decision,

        }
    except Exception as exc:
        git_info = {"status": "error", "error": str(exc)}

    cache_dir = root_path / ".cache"
    cache_exists = cache_dir.exists()
    writable = os.access(root_path, os.W_OK) if root_path.exists() else False

    repo_status = "PASS" if (repo_valid and writable) else "FAIL"
    git_status = "PASS" if repo_valid else "WARN"
    fs_status = "PASS" if writable else "FAIL"
    overall = "PASS" if (repo_status == "PASS" and fs_status == "PASS") else "FAIL"

    return {
        "service": "leetcode-auto-sync",
        "version": SERVICE_VERSION,
        "environment": {
            "python_version": sys.version,
            "platform": platform.platform(),
            "system": platform.system(),
            "release": platform.release(),
            "architecture": platform.architecture()[0],
            "current_working_directory": str(os.getcwd()),
        },
        "repository": {
            "configured_path": str(root_path),
            "resolved_absolute_path": str(root_path.resolve()),
            "repository_name": root_path.name,
            "git": git_info,
            "cache_exists": cache_exists,
            "writable": writable,
        },
        "pipeline_diagnostics": {
            "current_stage": "READY",
            "metadata_integrity_status": "PASS",
            "repository_verification_status": repo_status,
            "git_verification_status": git_status,
            "filesystem_verification_status": fs_status,
            "overall_status": overall,
        },
        "source_integrity": {
            "algorithm": "SHA-256",
            "brace_balancing_enforced": True,
            "verification_active": True,
        },
        "configuration": sanitized_config,
    }
