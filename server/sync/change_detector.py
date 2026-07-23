"""Hash-based change detection with disk and memory cache."""

from __future__ import annotations

import json
import logging
import os
import tempfile
from pathlib import Path
from typing import Dict, Optional

from .file_diff import FileDiff

logger = logging.getLogger(__name__)


class ChangeDetector:
    """Detects whether content changes require disk writes using SHA-256 hashes."""

    def __init__(self, repo_root: Path | str) -> None:
        self.repo_root = Path(repo_root).expanduser().resolve()
        self.cache_file = self.repo_root / ".cache" / "sync_hashes.json"
        self._hashes: Dict[str, str] = {}
        self.load_cache()

    def _rel_path(self, path: Path | str) -> str:
        p = Path(path).expanduser().resolve()
        try:
            return p.relative_to(self.repo_root).as_posix()
        except ValueError:
            return p.as_posix()

    def load_cache(self) -> None:
        """Load stored file hashes from .cache/sync_hashes.json."""
        if self.cache_file.exists():
            try:
                data = json.loads(self.cache_file.read_text(encoding="utf-8"))
                if isinstance(data, dict):
                    self._hashes = {k: str(v) for k, v in data.items()}
            except Exception as exc:
                logger.warning(f"Failed to load sync hash cache: {exc}")
                self._hashes = {}
        else:
            self._hashes = {}

    def save_cache(self) -> None:
        """Atomically persist file hashes to .cache/sync_hashes.json."""
        try:
            self.cache_file.parent.mkdir(parents=True, exist_ok=True)
            fd, tmp_path = tempfile.mkstemp(dir=str(self.cache_file.parent))
            content = json.dumps(self._hashes, indent=2, sort_keys=True)
            with os.fdopen(fd, "w", encoding="utf-8") as fh:
                fh.write(content)
            os.replace(tmp_path, str(self.cache_file))
        except Exception as exc:
            logger.warning(f"Failed to save sync hash cache: {exc}")
            try:
                if Path(tmp_path).exists():
                    Path(tmp_path).unlink()
            except Exception:
                pass

    def get_file_hash(self, content: str | bytes) -> str:
        """Return SHA-256 hash for content."""
        return FileDiff.hash(content)

    def detect_file_change(self, file_path: Path | str, new_content: str) -> bool:
        """Return True if `new_content` differs semantically from the file on disk."""
        target_path = Path(file_path).expanduser().resolve()
        rel_key = self._rel_path(target_path)
        new_hash = self.get_file_hash(new_content)

        # 1. Fast check: if target file exists and hash matches cache, no change
        if target_path.exists() and self._hashes.get(rel_key) == new_hash:
            return False

        # 2. Disk check: if target file doesn't exist, change detected
        if not target_path.exists():
            return True

        # 3. Read disk content and perform normalized semantic diff
        try:
            existing_content = target_path.read_text(encoding="utf-8")
            changed = FileDiff.has_semantic_change(existing_content, new_content)
            if not changed:
                # Update cache so future checks hit fast path
                self._hashes[rel_key] = new_hash
                self.save_cache()
            return changed
        except Exception as exc:
            logger.warning(f"Failed reading {target_path} for change detection: {exc}")
            return True

    def record_change(self, file_path: Path | str, content: str) -> None:
        """Record content hash in memory and persist to cache file."""
        rel_key = self._rel_path(file_path)
        self._hashes[rel_key] = self.get_file_hash(content)
        self.save_cache()
