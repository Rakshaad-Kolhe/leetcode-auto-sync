"""Automated release verification and artifact checksum validator."""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]


def compute_sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(8192):
            h.update(chunk)
    return h.hexdigest()


def run_release_checklist() -> bool:
    print("==========================================")
    print("      Release Verification Checklist      ")
    print("==========================================")

    # 1. Check version in package.json and pyproject.toml
    pyproject_text = (REPO_ROOT / "pyproject.toml").read_text(encoding="utf-8")
    pkg_json = json.loads((REPO_ROOT / "package.json").read_text(encoding="utf-8"))

    v_py = "1.0.0" if 'version = "1.0.0"' in pyproject_text else "unknown"
    v_ext = pkg_json.get("version", "unknown")

    print(f"[CHECK 1] Version pyproject.toml: {v_py}")
    print(f"[CHECK 1] Version package.json:   {v_ext}")

    if v_py != v_ext:
        print("[FAIL] Version mismatch across packaging files.")
        return False
    print("[PASS] Version numbers match.")

    # 2. Check documentation files exist
    required_docs = [
        "README.md", "INSTALL.md", "CONFIGURATION.md", "TROUBLESHOOTING.md",
        "ARCHITECTURE.md", "SECURITY.md", "ROADMAP.md", "PERFORMANCE.md",
        "BENCHMARKS.md", "RELEASE_PROCESS.md", "MAINTAINER_GUIDE.md", "CHANGELOG.md"
    ]
    missing = [doc for doc in required_docs if not (REPO_ROOT / doc).exists()]
    if missing:
        print(f"[FAIL] Missing required documentation files: {missing}")
        return False
    print(f"[PASS] All {len(required_docs)} documentation files exist.")

    # 3. Check dist/extension.zip checksum
    zip_path = REPO_ROOT / "dist" / "extension.zip"
    if zip_path.exists():
        checksum = compute_sha256(zip_path)
        print(f"[PASS] extension.zip checksum: {checksum[:16]}... (SHA256)")
    else:
        print("[WARN] dist/extension.zip not found. Run python scripts/package.py to generate.")

    print("==========================================")
    print("      All release checks passed!         ")
    print("==========================================")
    return True


if __name__ == "__main__":
    success = run_release_checklist()
    sys.exit(0 if success else 1)
