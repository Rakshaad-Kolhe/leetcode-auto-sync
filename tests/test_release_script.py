"""Unit tests for scripts/release.py release automation script."""

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SCRIPTS_DIR = PROJECT_ROOT / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from release import compute_sha256, generate_release_notes, run_release_automation


def test_compute_sha256(tmp_path: Path):
    sample_file = tmp_path / "sample.txt"
    sample_file.write_text("leetcode-auto-sync v1.0.1", encoding="utf-8")
    checksum = compute_sha256(sample_file)
    assert len(checksum) == 64  # Valid SHA-256 hex digest length


def test_generate_release_notes():
    notes = generate_release_notes()
    assert "v1.0.1" in notes
    assert "Highlights" in notes
    assert "CI & Compatibility Fixes" in notes


def test_run_release_automation():
    assert run_release_automation() is True
