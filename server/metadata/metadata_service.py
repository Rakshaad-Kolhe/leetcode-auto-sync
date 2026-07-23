"""High-level metadata enrichment service with caching and fallback."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Dict, Optional

from config import LEETCODE_REPO_PATH
from config.config_manager import AppConfig, ConfigManager, MetadataConfig

from .cache import MetadataCache
from .graphql_client import LeetCodeGraphQLClient
from .models import EnrichedMetadata

logger = logging.getLogger(__name__)


class MetadataService:
    """Orchestrates metadata retrieval from cache, GraphQL, or submission fallback."""

    def __init__(
        self,
        repo_path: Path | str | None = None,
        graphql_client: Optional[LeetCodeGraphQLClient] = None,
        cache: Optional[MetadataCache] = None,
        *,
        repo_root: Path | str | None = None,
        config: AppConfig | MetadataConfig | ConfigManager | None = None,
    ) -> None:
        target_path = repo_root or repo_path or LEETCODE_REPO_PATH
        root = Path(target_path).expanduser().resolve()

        if isinstance(config, AppConfig):
            meta_cfg = config.metadata
        elif isinstance(config, MetadataConfig):
            meta_cfg = config
        elif isinstance(config, ConfigManager):
            meta_cfg = config.get_config().metadata
        else:
            meta_cfg = ConfigManager.get_instance(repo_root=root).get_config().metadata

        self.enable_graphql = meta_cfg.enable_graphql
        max_age_seconds = meta_cfg.cache_days * 86400

        cache_dir = root / ".cache" / "metadata"
        self.cache = cache or MetadataCache(cache_dir=cache_dir, max_age_seconds=max_age_seconds)
        self.client = graphql_client or LeetCodeGraphQLClient()

    def get_metadata(
        self,
        slug: str,
        *,
        problem_number: int = 0,
        title: str = "",
        difficulty: str = "Medium",
        submission_data: Optional[Dict[str, Any]] = None,
    ) -> EnrichedMetadata:
        """Fetch enriched metadata for `slug` with automatic cache and fallback handling."""

        if not slug:
            return self._fallback_metadata(
                slug=slug,
                problem_number=problem_number,
                title=title,
                difficulty=difficulty,
                submission_data=submission_data,
            )

        clean_slug = slug.strip().lower()

        # 1. Check local cache
        cached = self.cache.get(clean_slug)
        if cached:
            logger.info(f"Metadata cache hit for slug '{clean_slug}'")
            return cached

        # 2. Query GraphQL endpoint if enabled
        if not self.enable_graphql:
            logger.info(f"GraphQL disabled by configuration; using fallback metadata for '{clean_slug}'.")
            return self._fallback_metadata(
                slug=clean_slug,
                problem_number=problem_number,
                title=title,
                difficulty=difficulty,
                submission_data=submission_data,
            )

        logger.info(f"Querying LeetCode GraphQL API for slug '{clean_slug}'...")
        enriched = self.client.fetch_problem_metadata(clean_slug)

        if enriched:
            # Save to cache
            self.cache.set(clean_slug, enriched)
            return enriched

        # 3. Fallback to basic submission metadata on GraphQL failure
        logger.warning(f"GraphQL unavailable for '{clean_slug}'; falling back to submission metadata.")
        return self._fallback_metadata(
            slug=clean_slug,
            problem_number=problem_number,
            title=title,
            difficulty=difficulty,
            submission_data=submission_data,
        )

    def _fallback_metadata(
        self,
        slug: str,
        problem_number: int,
        title: str,
        difficulty: str,
        submission_data: Optional[Dict[str, Any]] = None,
    ) -> EnrichedMetadata:
        sub = submission_data or {}
        p_num = sub.get("id") or problem_number
        p_title = sub.get("title") or title or slug.replace("-", " ").title()
        p_diff = sub.get("difficulty") or difficulty or "Medium"

        return EnrichedMetadata(
            problem_number=p_num,
            title=p_title,
            slug=slug,
            difficulty=p_diff,
            acceptance_rate=None,
            likes=None,
            dislikes=None,
            topics=[],
            companies=[],
            hints=[],
            similar_questions=[],
        )
