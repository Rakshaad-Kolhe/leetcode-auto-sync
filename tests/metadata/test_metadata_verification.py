"""Tests for metadata verification and consistency checks."""

from __future__ import annotations

import sys
from pathlib import Path
import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from server.metadata.metadata_service import MetadataService, MetadataMismatchError
from server.metadata.models import EnrichedMetadata
from server.schemas import Submission


def test_verify_metadata_consistency_success():
    service = MetadataService()
    enriched = EnrichedMetadata(
        problem_number=9,
        title="Palindrome Number",
        slug="palindrome-number",
        difficulty="Easy",
    )
    # Matching metadata should pass without error
    service.verify_metadata_consistency(
        submission_id=9,
        submission_title="Palindrome Number",
        submission_slug="palindrome-number",
        enriched=enriched,
    )


def test_verify_metadata_consistency_mismatched_id_aborts():
    service = MetadataService()
    enriched = EnrichedMetadata(
        problem_number=9,
        title="Palindrome Number",
        slug="palindrome-number",
        difficulty="Easy",
    )
    # Submission ID 6 with slug "palindrome-number" must raise MetadataMismatchError
    with pytest.raises(MetadataMismatchError) as exc_info:
        service.verify_metadata_consistency(
            submission_id=6,
            submission_title="Zigzag Conversion",
            submission_slug="palindrome-number",
            enriched=enriched,
        )
    assert "Expected frontend ID 9" in str(exc_info.value)
    assert "received ID 6" in str(exc_info.value)


def test_verify_metadata_consistency_mismatched_slug_aborts():
    service = MetadataService()
    enriched = EnrichedMetadata(
        problem_number=9,
        title="Palindrome Number",
        slug="palindrome-number",
        difficulty="Easy",
    )
    with pytest.raises(MetadataMismatchError) as exc_info:
        service.verify_metadata_consistency(
            submission_id=9,
            submission_title="Palindrome Number",
            submission_slug="zigzag-conversion",
            enriched=enriched,
        )
    assert "Expected slug 'palindrome-number'" in str(exc_info.value)
