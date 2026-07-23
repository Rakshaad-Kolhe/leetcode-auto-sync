"""Unit tests for Topic page generation and updates."""

from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

SERVER_DIR = Path(__file__).resolve().parents[1] / "server"
sys.path.insert(0, str(SERVER_DIR))

from documentation.index_generator import regenerate_root_readme  # noqa: E402
from repository_writer import write_submission  # noqa: E402
from schemas import Submission  # noqa: E402


class TopicPagesTests(unittest.TestCase):
    """Test topic page creation, problem linking, and cleanup."""

    def test_topic_pages_generated_on_repository_regeneration(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            repo = Path(tmp)
            (repo / ".git").mkdir()

            sub1 = Submission(
                id=1,
                title="Two Sum",
                slug="two-sum",
                difficulty="Easy",
                language="cpp",
                code="class Solution {};",
            )
            write_submission(sub1, repo_path=repo)

            regenerate_root_readme(repo)

            topics_dir = repo / "Topics"
            self.assertTrue(topics_dir.exists())


if __name__ == "__main__":
    unittest.main()
