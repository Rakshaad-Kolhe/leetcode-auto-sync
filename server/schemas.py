"""Pydantic schemas for the API contract."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, validator


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

    @validator("title", "slug", "language", "code")
    def not_blank(cls, v: str) -> str:  # pragma: no cover - trivial
        """Strip whitespace and ensure strings are not empty after trimming."""

        v2 = v.strip()
        if not v2:
            raise ValueError("must not be empty")
        return v2
