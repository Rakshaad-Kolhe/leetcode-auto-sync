"""Filesystem cache for LeetCode metadata."""

from __future__ import annotations

from datetime import datetime, timezone
import json
import logging
from pathlib import Path
from typing import Any, Dict, Optional

from .models import CompanyTag, EnrichedMetadata, RelatedProblem, TopicTag

logger = logging.getLogger(__name__)

DEFAULT_CACHE_MAX_AGE_SECONDS = 7 * 86400  # 7 days


class MetadataCache:
    """JSON file cache for storing and retrieving enriched problem metadata."""

    def __init__(self, cache_dir: Path | str, max_age_seconds: int = DEFAULT_CACHE_MAX_AGE_SECONDS) -> None:
        self.cache_dir = Path(cache_dir).expanduser().resolve()
        self.max_age_seconds = max_age_seconds

    def get(self, slug: str) -> Optional[EnrichedMetadata]:
        """Retrieve cached metadata for `slug` if present and fresh."""

        if not slug:
            return None

        file_path = self._cache_file_path(slug)
        if not file_path.exists():
            return None

        try:
            content = file_path.read_text(encoding="utf-8")
            data = json.loads(content)

            if self._is_expired(data.get("cached_at")):
                logger.info(f"Metadata cache for '{slug}' is stale; refreshing...")
                return None

            return self._dict_to_metadata(data)
        except Exception as exc:
            logger.warning(f"Error reading metadata cache for '{slug}': {exc}")
            return None

    def set(self, slug: str, metadata: EnrichedMetadata) -> bool:
        """Save `metadata` for `slug` to filesystem cache."""

        if not slug or not metadata:
            return False

        file_path = self._cache_file_path(slug)
        try:
            file_path.parent.mkdir(parents=True, exist_ok=True)
            payload = self._metadata_to_dict(metadata)
            payload["cached_at"] = datetime.now(timezone.utc).isoformat()
            file_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
            return True
        except Exception as exc:
            logger.warning(f"Error writing metadata cache for '{slug}': {exc}")
            return False

    def clear(self) -> None:
        """Clear all cached metadata files."""

        try:
            if self.cache_dir.exists():
                for file_path in self.cache_dir.glob("*.json"):
                    file_path.unlink()
        except Exception as exc:
            logger.warning(f"Error clearing metadata cache: {exc}")

    def _cache_file_path(self, slug: str) -> Path:
        safe_slug = slug.strip().lower().replace("/", "_").replace("\\", "_")
        return self.cache_dir / f"{safe_slug}.json"

    def _is_expired(self, cached_at_str: Optional[str]) -> bool:
        if not cached_at_str:
            return True
        try:
            cached_dt = datetime.fromisoformat(cached_at_str)
            now = datetime.now(timezone.utc)
            return (now - cached_dt).total_seconds() > self.max_age_seconds
        except Exception:
            return True

    def _metadata_to_dict(self, metadata: EnrichedMetadata) -> Dict[str, Any]:
        return {
            "problem_number": metadata.problem_number,
            "title": metadata.title,
            "slug": metadata.slug,
            "difficulty": metadata.difficulty,
            "acceptance_rate": metadata.acceptance_rate,
            "likes": metadata.likes,
            "dislikes": metadata.dislikes,
            "topics": [{"name": t.name, "slug": t.slug} for t in metadata.topics],
            "companies": [{"name": c.name, "slug": c.slug} for c in metadata.companies],
            "hints": metadata.hints,
            "similar_questions": [
                {"title": r.title, "title_slug": r.title_slug, "difficulty": r.difficulty}
                for r in metadata.similar_questions
            ],
            "raw": metadata.raw,
        }

    def _dict_to_metadata(self, data: Dict[str, Any]) -> EnrichedMetadata:
        topics = [
            TopicTag(name=t["name"], slug=t.get("slug", ""))
            for t in data.get("topics", [])
            if isinstance(t, dict) and "name" in t
        ]
        companies = [
            CompanyTag(name=c["name"], slug=c.get("slug", ""))
            for c in data.get("companies", [])
            if isinstance(c, dict) and "name" in c
        ]
        similar_questions = [
            RelatedProblem(
                title=r["title"],
                title_slug=r.get("title_slug", r.get("titleSlug", "")),
                difficulty=r.get("difficulty", "Medium"),
            )
            for r in data.get("similar_questions", [])
            if isinstance(r, dict) and "title" in r
        ]

        return EnrichedMetadata(
            problem_number=data.get("problem_number", 0),
            title=data.get("title", ""),
            slug=data.get("slug", ""),
            difficulty=data.get("difficulty", "Medium"),
            acceptance_rate=data.get("acceptance_rate"),
            likes=data.get("likes"),
            dislikes=data.get("dislikes"),
            topics=topics,
            companies=companies,
            hints=data.get("hints", []),
            similar_questions=similar_questions,
            raw=data.get("raw", {}),
        )
