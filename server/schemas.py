"""Pydantic schemas for the API contract."""

from __future__ import annotations

from typing import Literal

try:
    from pydantic import BaseModel, Field, field_validator
except ImportError:  # Fallback for Pydantic v1
    from pydantic import BaseModel, Field, validator as field_validator  # type: ignore[assignment]


class Submission(BaseModel):
    """Model representing a LeetCode submission sent by the browser extension.

    Validation rules are enforced via Pydantic field constraints and validators.
    """

    id: int = Field(..., gt=0, description="Problem identifier, must be > 0")
    title: str = Field(..., min_length=1, description="Problem title, non-empty")
    slug: str = Field(..., min_length=1, description="Problem slug, non-empty")
    difficulty: Literal["Easy", "Medium", "Hard"]
    language: str = Field(..., min_length=1, description="Programming language, non-empty")
    code: str = Field(..., min_length=1, description="Solution code, non-empty")
    trace_id: str | None = Field(None, description="End-to-end trace identifier")
    source_hash: str | None = Field(None, description="Optional SHA-256 hex checksum of original source code")
    line_count: int | None = Field(None, description="Optional line count of solution code")
    char_count: int | None = Field(None, description="Optional character count of solution code")


    @field_validator("title", "slug", "language")
    @classmethod
    def not_blank(cls, v: str) -> str:
        """Strip whitespace and ensure metadata strings are not empty after trimming."""
        v2 = v.strip()
        if not v2:
            raise ValueError("must not be empty")
        return v2

    @field_validator("slug")
    @classmethod
    def validate_slug_title_consistency(cls, v: str, info) -> str:
        """Validate that problem slug and title are consistent and not mixed from SPA navigation."""
        clean_slug = v.strip().lower()
        title = info.data.get("title")
        if title:
            norm_title = "".join(c if c.isalnum() else "-" for c in title.lower())
            norm_title_tokens = set(filter(None, norm_title.split("-")))
            slug_tokens = set(clean_slug.split("-"))

            slug_non_num = {t for t in slug_tokens if not t.isdigit()}
            title_non_num = {t for t in norm_title_tokens if not t.isdigit()}

            if slug_non_num and title_non_num and not slug_non_num.intersection(title_non_num):
                raise ValueError(
                    f"Metadata integrity mismatch: title '{title}' does not correspond to slug '{clean_slug}'."
                )
        return clean_slug

    @field_validator("code")
    @classmethod
    def validate_code_not_blank(cls, v: str) -> str:
        """Ensure code is non-empty without mutating whitespace."""
        if not v or not v.strip():
            raise ValueError("must not be empty")
        return v
