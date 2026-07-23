"""Unit tests for metadata filesystem cache."""

from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

SERVER_DIR = Path(__file__).resolve().parents[1] / "server"
sys.path.insert(0, str(SERVER_DIR))

from metadata.cache import MetadataCache  # noqa: E402
from metadata.models import CompanyTag, EnrichedMetadata, TopicTag  # noqa: E402


class MetadataCacheTests(unittest.TestCase):
    """Test cache reads, writes, expiration, and error resiliency."""

    def test_cache_miss_returns_none(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            cache = MetadataCache(tmp)
            self.assertIsNone(cache.get("non-existent-slug"))

    def test_cache_set_and_get_roundtrip(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            cache = MetadataCache(tmp)
            metadata = EnrichedMetadata(
                problem_number=1,
                title="Two Sum",
                slug="two-sum",
                difficulty="Easy",
                acceptance_rate="50.0%",
                likes=1000,
                dislikes=50,
                topics=[TopicTag(name="Array", slug="array")],
                companies=[CompanyTag(name="Google", slug="google")],
                hints=["Use a Hash Map"],
            )

            success = cache.set("two-sum", metadata)
            self.assertTrue(success)

            cached = cache.get("two-sum")
            self.assertIsNotNone(cached)
            self.assertEqual(cached.problem_number, 1)
            self.assertEqual(cached.title, "Two Sum")
            self.assertEqual(cached.acceptance_rate, "50.0%")
            self.assertEqual(cached.topic_names(), ["Array"])
            self.assertEqual(cached.company_names(), ["Google"])

    def test_corrupt_cache_returns_none_safely(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            cache = MetadataCache(tmp)
            cache_file = Path(tmp) / "bad-slug.json"
            cache_file.write_text("{corrupt json", encoding="utf-8")

            self.assertIsNone(cache.get("bad-slug"))


if __name__ == "__main__":
    unittest.main()
