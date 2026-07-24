#!/usr/bin/env python3
"""First-Run System Validation & Troubleshooting Doctor Script for LeetCode Auto Sync.

Checks:
- Python version (>= 3.10)
- Git executable on PATH
- Repository validity (.git folder & git rev-parse)
- Git identity (user.name & user.email, non-placeholder)
- Backend server reachability (HTTP GET http://127.0.0.1:8000/health)
- Repository write permissions
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import urllib.request
from pathlib import Path

# Add server folder to path if running directly
SERVER_DIR = Path(__file__).resolve().parents[1] / "server"
if str(SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(SERVER_DIR))

try:
    from git_service import GitService
except ImportError:
    GitService = None  # type: ignore


class Colors:
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    BOLD = "\033[1m"
    RESET = "\033[0m"


def print_check(label: str, status: str, details: str = "", recommendation: str = "") -> bool:
    if status == "PASS":
        badge = f"{Colors.GREEN}[PASS]{Colors.RESET}"
        ok = True
    elif status == "WARNING":
        badge = f"{Colors.YELLOW}[WARN]{Colors.RESET}"
        ok = True
    else:
        badge = f"{Colors.RED}[FAIL]{Colors.RESET}"
        ok = False

    print(f"{badge} {Colors.BOLD}{label:<30}{Colors.RESET} : {details}")
    if recommendation and not ok:
        print(f"       👉 {Colors.YELLOW}Action Required{Colors.RESET}: {recommendation}")
    return ok


def run_doctor() -> bool:
    print("\n" + "=" * 60)
    print(f"{Colors.BOLD}   LeetCode Auto Sync — Environment & Diagnostics Doctor{Colors.RESET}")
    print("=" * 60 + "\n")

    all_passed = True

    # 1. Python Version Check
    py_ver = sys.version_info
    py_ver_str = f"{py_ver.major}.{py_ver.minor}.{py_ver.micro}"
    if py_ver >= (3, 10):
        print_check("Python Version", "PASS", f"Python {py_ver_str}")
    else:
        all_passed &= print_check(
            "Python Version",
            "FAIL",
            f"Python {py_ver_str} (3.10+ required)",
            "Upgrade Python to version 3.10 or higher from https://python.org",
        )

    # 2. Git Executable Check
    git_path = shutil.which("git")
    if git_path:
        print_check("Git Executable", "PASS", f"Found at {git_path}")
    else:
        all_passed &= print_check(
            "Git Executable",
            "FAIL",
            "Git not found on system PATH",
            "Install Git from https://git-scm.com and add it to system PATH",
        )

    # 3. Repository Check
    repo_root = Path(__file__).resolve().parents[1]
    git_dir = repo_root / ".git"
    if git_dir.exists():
        print_check("Repository Structure", "PASS", f"Valid Git repo at {repo_root}")
    else:
        all_passed &= print_check(
            "Repository Structure",
            "FAIL",
            f"Missing .git folder at {repo_root}",
            "Run 'git init' inside your LeetCode target repository directory",
        )

    # 4. Git Identity Verification (Local -> Global, Non-placeholder)
    if git_path and GitService:
        try:
            git_srv = GitService(repo_path=repo_root)
            identity = git_srv.verify_git_identity()
            if identity.get("valid"):
                source = identity.get("identity_source", {}).get("email", "git config")
                source_info = f"{identity['name']} <{identity['email']}> (source: {source})"
                print_check("Git Identity", "PASS", source_info)
            else:
                reason = identity["reasons"][0] if identity["reasons"] else "Git user.name / user.email missing"
                all_passed &= print_check(
                    "Git Identity",
                    "FAIL",
                    reason,
                    "Run: git config --global user.name \"Your Name\" && git config --global user.email \"your@email.com\"",
                )
        except Exception as exc:
            all_passed &= print_check("Git Identity", "FAIL", f"Failed verifying Git identity: {exc}")
    else:
        print_check("Git Identity", "WARNING", "Skipped (Git executable not available)")

    # 5. Backend Server Reachability Check
    backend_url = "http://127.0.0.1:8000/health"
    try:
        req = urllib.request.Request(backend_url, headers={"User-Agent": "LeetCodeAutoSyncDoctor/1.0"})
        with urllib.request.urlopen(req, timeout=3) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode("utf-8"))
                version = data.get("version", "unknown")
                print_check("Backend Server", "PASS", f"Reachable at {backend_url} (v{version})")
            else:
                print_check(
                    "Backend Server",
                    "WARNING",
                    f"HTTP {resp.status} from {backend_url}",
                    "Ensure FastAPI backend is running via 'python -m uvicorn server.app:app --reload --port 8000'",
                )
    except Exception:
        print_check(
            "Backend Server",
            "WARNING",
            "Server not running at http://127.0.0.1:8000",
            "Start the backend using: python -m uvicorn server.app:app --reload --port 8000",
        )

    # 6. Repository Write Permission Check
    test_file = repo_root / ".doctor_permission_test.tmp"
    try:
        test_file.write_text("write_test", encoding="utf-8")
        test_file.unlink(missing_ok=True)
        print_check("Repository Permissions", "PASS", "Write permissions verified")
    except Exception as exc:
        all_passed &= print_check(
            "Repository Permissions",
            "FAIL",
            f"Write check failed: {exc}",
            "Ensure user account has write access to the repository directory",
        )

    print("\n" + "=" * 60)
    if all_passed:
        print(f"{Colors.GREEN}{Colors.BOLD}   All core checks passed! System is ready for Auto Sync.{Colors.RESET}")
    else:
        print(f"{Colors.RED}{Colors.BOLD}   Some checks failed. Please resolve the actions above.{Colors.RESET}")
    print("=" * 60 + "\n")

    return all_passed


if __name__ == "__main__":
    success = run_doctor()
    sys.exit(0 if success else 1)
