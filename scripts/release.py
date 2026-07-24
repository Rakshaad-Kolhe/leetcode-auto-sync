"""Release automation script for LeetCode Auto Sync v1.0.1."""

from __future__ import annotations

import hashlib
import json
import os
import sys
import zipfile
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
TARGET_VERSION = "1.0.1"


def compute_sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(8192):
            h.update(chunk)
    return h.hexdigest()


def generate_release_notes() -> str:
    return f"""# LeetCode Auto Sync v{TARGET_VERSION} Release Notes

## Highlights 🎉
- Production release candidate for LeetCode Auto Sync.
- Full observability, reliability telemetry, and release automation.

## CI & Compatibility Fixes 🛠️
- Fixed `fastapi.testclient` dependency error by including `httpx>=0.27.0` in `server/requirements.txt`.
- Resolved Pydantic `@validator` deprecation warning by upgrading schemas to `@field_validator`.

## Features & Improvements ⚡
- **Modular Structured Logging**: `server/logging/` package emitting machine-readable JSON logs and human-readable terminal logs.
- **Runtime Performance Telemetry**: Modular `server/metrics/` exposing `GET /metrics` with `version: "{TARGET_VERSION}"`.
- **Atomic Operations & Rollback**: `TransactionSnapshot` filesystem rollback engine.
- **Benchmark Suite**: `benchmarks/benchmark_sync.py` measuring 100, 500, and 1000 submission runs.

## Checksums 🔒
*(Generated during build pipeline)*
"""


def run_release_automation() -> bool:
    print(f"==================================================")
    print(f"    LeetCode Auto Sync Release Manager (v{TARGET_VERSION})  ")
    print(f"==================================================")

    # 1. Check version in package manifests
    pyproject_text = (REPO_ROOT / "pyproject.toml").read_text(encoding="utf-8")
    pkg_json = json.loads((REPO_ROOT / "package.json").read_text(encoding="utf-8"))
    manifest_json = json.loads((REPO_ROOT / "extension" / "manifest.json").read_text(encoding="utf-8"))

    v_py = TARGET_VERSION if f'version = "{TARGET_VERSION}"' in pyproject_text else "mismatch"
    v_pkg = pkg_json.get("version", "mismatch")
    v_man = manifest_json.get("version", "mismatch")

    print(f"[CHECK 1] pyproject.toml version: {v_py}")
    print(f"[CHECK 1] package.json version:   {v_pkg}")
    print(f"[CHECK 1] manifest.json version:  {v_man}")

    if v_py != TARGET_VERSION or v_pkg != TARGET_VERSION or v_man != TARGET_VERSION:
        print("[FAIL] Version numbers do not match target version.")
        return False
    print("[PASS] All package manifests have matching version 1.0.1.")

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

    # 3. Check extension package
    dist_dir = REPO_ROOT / "dist"
    dist_dir.mkdir(exist_ok=True)
    zip_path = dist_dir / "extension.zip"
    if not zip_path.exists():
        print("[INFO] Packaging extension to dist/extension.zip...")
        ext_dir = REPO_ROOT / "extension"
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
            for root, _, files in os.walk(ext_dir):
                for file in files:
                    file_path = Path(root) / file
                    rel_path = file_path.relative_to(ext_dir)
                    zipf.write(file_path, arcname=rel_path)

    checksum = compute_sha256(zip_path)
    print(f"[PASS] extension.zip checksum: {checksum} (SHA256)")

    # 4. Save generated release notes
    rel_notes_path = dist_dir / "RELEASE_NOTES.md"
    rel_notes_content = generate_release_notes() + f"\n- extension.zip: `{checksum}`\n"
    rel_notes_path.write_text(rel_notes_content, encoding="utf-8")
    print(f"[PASS] Saved release notes to {rel_notes_path}")

    print("==================================================")
    print("      Release Automation completed successfully!  ")
    print("==================================================")
    return True


if __name__ == "__main__":
    success = run_release_automation()
    sys.exit(0 if success else 1)
