"""Unit tests for ChangeDetector."""

import sys
from pathlib import Path

SERVER_DIR = Path(__file__).resolve().parents[1] / "server"
if str(SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(SERVER_DIR))

from sync.change_detector import ChangeDetector


def test_change_detector_non_existent_file(tmp_path: Path):
    detector = ChangeDetector(tmp_path)
    test_file = tmp_path / "test.txt"
    assert detector.detect_file_change(test_file, "hello world")


def test_change_detector_semantic_unchanged(tmp_path: Path):
    detector = ChangeDetector(tmp_path)
    test_file = tmp_path / "test.txt"
    test_file.write_text("hello world\n", encoding="utf-8")

    assert not detector.detect_file_change(test_file, "hello world\r\n")


def test_change_detector_hash_cache_persistence(tmp_path: Path):
    detector1 = ChangeDetector(tmp_path)
    test_file = tmp_path / "test.txt"
    content = "sample code"
    test_file.write_text(content + "\n", encoding="utf-8")

    detector1.record_change(test_file, content)

    # Check cache file written
    cache_path = tmp_path / ".cache" / "sync_hashes.json"
    assert cache_path.exists()

    detector2 = ChangeDetector(tmp_path)
    assert not detector2.detect_file_change(test_file, content)
