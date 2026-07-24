"""Atomic transaction snapshot and rollback engine for synchronization."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Dict, Optional

logger = logging.getLogger(__name__)


class TransactionSnapshot:
    """Captures filesystem snapshot of modified files to roll back on sync failure."""

    def __init__(self, repo_root: Path | str) -> None:
        self.repo_root = Path(repo_root).expanduser().resolve()
        self._originals: Dict[Path, Optional[str]] = {}

    def record_file(self, file_path: Path | str) -> None:
        """Record current state of file before modification."""
        p = Path(file_path).expanduser().resolve()
        if p in self._originals:
            return  # Already recorded initial state

        if p.exists():
            try:
                self._originals[p] = p.read_text(encoding="utf-8")
            except Exception as exc:
                logger.warning(f"Snapshot failed to record file {p}: {exc}")
                self._originals[p] = None
        else:
            self._originals[p] = None

    def rollback(self) -> None:
        """Revert all recorded files to their pre-transaction state."""
        logger.warning("[ROLLBACK] Reverting filesystem transaction snapshot...")
        for p, content in self._originals.items():
            try:
                if content is None:
                    if p.exists():
                        p.unlink()
                        logger.info(f"[ROLLBACK] Deleted created file {p}")
                else:
                    p.parent.mkdir(parents=True, exist_ok=True)
                    p.write_text(content, encoding="utf-8")
                    logger.info(f"[ROLLBACK] Restored file {p}")
            except Exception as exc:
                logger.error(f"[ROLLBACK] Failed to restore {p}: {exc}")
