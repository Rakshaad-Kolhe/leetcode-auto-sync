"""Normalized file content diffing and SHA-256 hashing utilities."""

from __future__ import annotations

import hashlib
from typing import Optional


def normalize_content(content: str) -> str:
    """Normalize text content for semantic comparisons.

    Converts line endings to LF, strips trailing whitespace from each line,
    and ensures a single trailing newline if non-empty.
    """
    if not content:
        return ""

    # Replace CRLF with LF
    text = content.replace("\r\n", "\n").replace("\r", "\n")

    # Strip trailing whitespace on each line
    lines = [line.rstrip() for line in text.split("\n")]

    # Rejoin lines
    normalized = "\n".join(lines)

    # Ensure single trailing newline if non-empty
    normalized = normalized.rstrip("\n")
    if normalized:
        normalized += "\n"

    return normalized


def compute_sha256(content: str | bytes) -> str:
    """Compute the SHA-256 hexadecimal hash for `content`."""
    if isinstance(content, str):
        normalized = normalize_content(content)
        data = normalized.encode("utf-8")
    else:
        data = content
    return hashlib.sha256(data).hexdigest()


class FileDiff:
    """Provides methods for comparing text file contents with normalization."""

    @staticmethod
    def normalize(content: str) -> str:
        """Return normalized text content."""
        return normalize_content(content)

    @staticmethod
    def hash(content: str | bytes) -> str:
        """Compute SHA-256 hash of normalized content or raw bytes."""
        return compute_sha256(content)

    @staticmethod
    def has_semantic_change(existing_content: Optional[str], new_content: str) -> bool:
        """Return True if `new_content` differs semantically from `existing_content`."""
        if existing_content is None:
            return bool(new_content.strip())
        return normalize_content(existing_content) != normalize_content(new_content)
