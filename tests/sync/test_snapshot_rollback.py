"""Unit tests for TransactionSnapshot atomic rollback engine."""

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from server.sync.snapshot import TransactionSnapshot


def test_snapshot_rollback_existing_file_restored(tmp_path: Path):
    target = tmp_path / "solution.py"
    target.write_text("original content", encoding="utf-8")

    snapshot = TransactionSnapshot(tmp_path)
    snapshot.record_file(target)

    # Modify file
    target.write_text("corrupted content", encoding="utf-8")
    assert target.read_text(encoding="utf-8") == "corrupted content"

    # Rollback
    snapshot.rollback()
    assert target.read_text(encoding="utf-8") == "original content"


def test_snapshot_rollback_new_file_deleted(tmp_path: Path):
    target = tmp_path / "new_solution.py"
    assert not target.exists()

    snapshot = TransactionSnapshot(tmp_path)
    snapshot.record_file(target)

    # Write new file
    target.write_text("new content", encoding="utf-8")
    assert target.exists()

    # Rollback
    snapshot.rollback()
    assert not target.exists()
