"""Unit tests for MetadataService orchestration and fallbacks."""

from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock

SERVER_DIR = Path(__file__).resolve().parents[1] / "server"
sys.path.insert(0, str(SERVER_DIR))

from metadata.cache import MetadataCache  # noqa: E402
from metadata.metadata_service import MetadataService  # noqa: E402
from metadata.models import EnrichedMetadata, TopicTag  # noqa: E402


class MetadataServiceTests(unittest.TestCase):
    """Test orchestration, caching layer integration, and fallback behavior."""

    def test_get_metadata_cache_hit(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            cache = MetadataCache(tmp)
            cached_meta = EnrichedMetadata(
                problem_number=1,
                title="Two Sum",
                slug="two-sum",
                difficulty="Easy",
                topics=[TopicTag(name="Array", slug="array")],
            )
            cache.set("two-sum", cached_meta)

            mock_client = MagicMock()
            service = MetadataService(repo_path=tmp, graphql_client=mock_client, cache=cache)

            result = service.get_metadata("two-sum")

            self.assertEqual(result.title, "Two Sum")
            self.assertEqual(result.topic_names(), ["Array"])
            mock_client.fetch_problem_metadata.assert_not_called()

    def test_get_metadata_graphql_fetch_and_cache_set(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            cache = MetadataCache(tmp)
            mock_client = MagicMock()
            graphql_meta = EnrichedMetadata(
                problem_number=3513,
                title="Number of Unique XOR Triplets I",
                slug="number-of-unique-xor-triplets-i",
                difficulty="Medium",
                topics=[TopicTag(name="Bit Manipulation", slug="bit-manipulation")],
            )
            mock_client.fetch_problem_metadata.return_value = graphql_meta

            service = MetadataService(repo_path=tmp, graphql_client=mock_client, cache=cache)
            result = service.get_metadata("number-of-unique-xor-triplets-i")

            self.assertEqual(result.problem_number, 3513)
            self.assertEqual(result.topic_names(), ["Bit Manipulation"])
            mock_client.fetch_problem_metadata.assert_called_once_with("number-of-unique-xor-triplets-i")

            # Verify it was saved to cache
            self.assertIsNotNone(cache.get("number-of-unique-xor-triplets-i"))

    def test_get_metadata_graphql_failure_falls_back_gracefully(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            cache = MetadataCache(tmp)
            mock_client = MagicMock()
            mock_client.fetch_problem_metadata.return_value = None

            service = MetadataService(repo_path=tmp, graphql_client=mock_client, cache=cache)
            result = service.get_metadata(
                "number-of-unique-xor-triplets-i",
                problem_number=3513,
                title="Number of Unique XOR Triplets I",
                difficulty="Medium",
            )

            self.assertEqual(result.problem_number, 3513)
            self.assertEqual(result.title, "Number of Unique XOR Triplets I")
            self.assertEqual(result.difficulty, "Medium")
            self.assertEqual(result.topics, [])
            self.assertEqual(result.companies, [])


if __name__ == "__main__":
    unittest.main()
