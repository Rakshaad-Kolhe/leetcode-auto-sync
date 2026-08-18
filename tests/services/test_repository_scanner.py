"""Pytest suite for Python RepositoryScanner service."""

from pathlib import Path
from server.services.repository_scanner import RepositoryScanner


def test_repository_scanner_empty() -> None:
    """Verify RepositoryScanner handles non-existent or empty repository paths gracefully."""
    scanner = RepositoryScanner()
    res = scanner.scan_repository()

    assert res["configured"] is False
    assert res["syncedCount"] == 0
    assert res["missingCount"] == 0
    assert res["hasReadme"] is False


def test_repository_scanner_parsing() -> None:
    """Verify RepositoryScanner parses problem directory structures correctly."""
    repo_dir = Path(__file__).parent.parent.parent
    scanner = RepositoryScanner(repo_path=repo_dir)
    res = scanner.scan_repository()

    assert "configured" in res
    assert "syncedProblems" in res
