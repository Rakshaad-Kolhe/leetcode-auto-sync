"""Unit tests for LeetCode GraphQL client."""

from __future__ import annotations

import io
import json
import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

SERVER_DIR = Path(__file__).resolve().parents[1] / "server"
sys.path.insert(0, str(SERVER_DIR))

from metadata.graphql_client import LeetCodeGraphQLClient  # noqa: E402


class LeetCodeGraphQLClientTests(unittest.TestCase):
    """Test GraphQL client parsing, HTTP requests, and error handling."""

    def setUp(self) -> None:
        self.client = LeetCodeGraphQLClient()

    def test_parse_valid_question_data(self) -> None:
        raw_question = {
            "questionFrontendId": "3513",
            "title": "Number of Unique XOR Triplets I",
            "titleSlug": "number-of-unique-xor-triplets-i",
            "difficulty": "Medium",
            "acRate": 63.4152,
            "likes": 421,
            "dislikes": 18,
            "topicTags": [
                {"name": "Bit Manipulation", "slug": "bit-manipulation"},
                {"name": "Array", "slug": "array"},
            ],
            "companyTagStats": json.dumps({
                "1": [{"name": "Google", "slug": "google"}, {"name": "Amazon", "slug": "amazon"}]
            }),
            "hints": ["Consider using XOR properties."],
            "similarQuestions": json.dumps([
                {"title": "Two Sum", "titleSlug": "two-sum", "difficulty": "Easy"}
            ]),
        }

        metadata = self.client.parse_question_data(raw_question)

        self.assertEqual(metadata.problem_number, 3513)
        self.assertEqual(metadata.title, "Number of Unique XOR Triplets I")
        self.assertEqual(metadata.slug, "number-of-unique-xor-triplets-i")
        self.assertEqual(metadata.difficulty, "Medium")
        self.assertEqual(metadata.acceptance_rate, "63.4%")
        self.assertEqual(metadata.likes, 421)
        self.assertEqual(metadata.dislikes, 18)
        self.assertEqual(metadata.topic_names(), ["Bit Manipulation", "Array"])
        self.assertEqual(metadata.company_names(), ["Google", "Amazon"])
        self.assertEqual(metadata.hints, ["Consider using XOR properties."])
        self.assertEqual(len(metadata.similar_questions), 1)
        self.assertEqual(metadata.similar_questions[0].title, "Two Sum")

    @patch("urllib.request.urlopen")
    def test_fetch_problem_metadata_success(self, mock_urlopen: MagicMock) -> None:
        mock_response = MagicMock()
        mock_response.status = 200
        mock_response.read.return_value = json.dumps({
            "data": {
                "question": {
                    "questionFrontendId": "1",
                    "title": "Two Sum",
                    "titleSlug": "two-sum",
                    "difficulty": "Easy",
                    "topicTags": [{"name": "Array", "slug": "array"}],
                }
            }
        }).encode("utf-8")
        mock_urlopen.return_value.__enter__.return_value = mock_response

        metadata = self.client.fetch_problem_metadata("two-sum")

        self.assertIsNotNone(metadata)
        self.assertEqual(metadata.problem_number, 1)
        self.assertEqual(metadata.title, "Two Sum")
        self.assertEqual(metadata.topic_names(), ["Array"])

    @patch("urllib.request.urlopen")
    def test_fetch_problem_metadata_http_error_returns_none(self, mock_urlopen: MagicMock) -> None:
        mock_urlopen.side_effect = Exception("HTTP 500 Internal Server Error")

        metadata = self.client.fetch_problem_metadata("broken-slug")

        self.assertIsNone(metadata)

    def test_fetch_empty_slug_returns_none(self) -> None:
        self.assertIsNone(self.client.fetch_problem_metadata(""))


if __name__ == "__main__":
    unittest.main()
