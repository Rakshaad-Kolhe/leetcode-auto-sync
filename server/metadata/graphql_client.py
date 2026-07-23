"""GraphQL client for retrieving authoritative LeetCode problem metadata."""

from __future__ import annotations

import json
import logging
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional

from .models import CompanyTag, EnrichedMetadata, RelatedProblem, TopicTag

logger = logging.getLogger(__name__)

GRAPHQL_ENDPOINT = "https://leetcode.com/graphql"
DEFAULT_TIMEOUT = 5

QUESTION_DETAIL_QUERY = """
query getQuestionDetail($titleSlug: String!) {
  question(titleSlug: $titleSlug) {
    questionId
    questionFrontendId
    title
    titleSlug
    difficulty
    likes
    dislikes
    acRate
    topicTags {
      name
      slug
    }
    companyTagStats
    hints
    similarQuestions
  }
}
"""


class LeetCodeGraphQLClient:
    """Client for fetching problem details from LeetCode's public GraphQL API."""

    def __init__(self, endpoint: str = GRAPHQL_ENDPOINT, timeout: int = DEFAULT_TIMEOUT) -> None:
        self.endpoint = endpoint
        self.timeout = timeout

    def fetch_problem_metadata(self, title_slug: str) -> Optional[EnrichedMetadata]:
        """Fetch problem details for `title_slug` via GraphQL.

        Returns an `EnrichedMetadata` instance if successful, or `None` if the
        request fails or the problem is not found.
        """

        if not title_slug:
            return None

        payload = {
            "query": QUESTION_DETAIL_QUERY,
            "variables": {"titleSlug": title_slug.strip().lower()},
        }

        try:
            raw_data = self._execute_query(payload)
            if not raw_data:
                return None

            question = raw_data.get("data", {}).get("question")
            if not question:
                logger.warning(f"GraphQL query succeeded but no question data found for slug: '{title_slug}'")
                return None

            return self.parse_question_data(question)
        except Exception as exc:
            logger.warning(f"Failed to fetch GraphQL metadata for slug '{title_slug}': {exc}")
            return None

    def parse_question_data(self, question: Dict[str, Any]) -> EnrichedMetadata:
        """Parse raw question dict from GraphQL response into `EnrichedMetadata`."""

        problem_number = int(question.get("questionFrontendId") or question.get("questionId") or 0)
        title = question.get("title", "")
        slug = question.get("titleSlug", "")
        difficulty = question.get("difficulty", "Medium")

        # Format acceptance rate to percentage string if float (e.g. 63.415 -> "63.4%")
        ac_rate_raw = question.get("acRate")
        acceptance_rate = None
        if ac_rate_raw is not None:
            try:
                rate_val = float(ac_rate_raw)
                acceptance_rate = f"{rate_val:.1f}%"
            except (ValueError, TypeError):
                acceptance_rate = str(ac_rate_raw)

        likes = question.get("likes")
        dislikes = question.get("dislikes")

        # Topic tags
        topics: List[TopicTag] = []
        for tag in question.get("topicTags") or []:
            if isinstance(tag, dict) and tag.get("name"):
                topics.append(TopicTag(name=tag["name"], slug=tag.get("slug", "")))

        # Company tags (companyTagStats may be stringified JSON or dict)
        companies: List[CompanyTag] = self._parse_company_tags(question.get("companyTagStats"))

        # Hints
        hints: List[str] = [h.strip() for h in (question.get("hints") or []) if isinstance(h, str) and h.strip()]

        # Similar questions (may be stringified JSON or list)
        similar_questions: List[RelatedProblem] = self._parse_similar_questions(question.get("similarQuestions"))

        return EnrichedMetadata(
            problem_number=problem_number,
            title=title,
            slug=slug,
            difficulty=difficulty,
            acceptance_rate=acceptance_rate,
            likes=int(likes) if likes is not None else None,
            dislikes=int(dislikes) if dislikes is not None else None,
            topics=topics,
            companies=companies,
            hints=hints,
            similar_questions=similar_questions,
            raw=question,
        )

    def _execute_query(self, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Send HTTP POST request to GraphQL endpoint."""

        data_bytes = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            self.endpoint,
            data=data_bytes,
            headers={
                "Content-Type": "application/json",
                "User-Agent": "LeetCode-Auto-Sync/1.0",
                "Referer": "https://leetcode.com",
            },
            method="POST",
        )

        with urllib.request.urlopen(req, timeout=self.timeout) as resp:
            if resp.status == 200:
                body = resp.read().decode("utf-8")
                return json.loads(body)
            else:
                logger.warning(f"GraphQL endpoint returned status code {resp.status}")
                return None

    def _parse_company_tags(self, raw_stats: Any) -> List[CompanyTag]:
        """Parse `companyTagStats` into a list of unique `CompanyTag` instances."""

        if not raw_stats:
            return []

        stats_dict = raw_stats
        if isinstance(raw_stats, str):
            try:
                stats_dict = json.loads(raw_stats)
            except Exception:
                return []

        seen_slugs = set()
        companies: List[CompanyTag] = []

        if isinstance(stats_dict, dict):
            # LeetCode format: {"1": [{"name": "Google", "slug": "google"}, ...], ...}
            for key, val in stats_dict.items():
                if isinstance(val, list):
                    for item in val:
                        if isinstance(item, dict) and item.get("name"):
                            slug = item.get("slug", item["name"].lower())
                            if slug not in seen_slugs:
                                seen_slugs.add(slug)
                                companies.append(CompanyTag(name=item["name"], slug=slug))
        elif isinstance(stats_dict, list):
            for item in stats_dict:
                if isinstance(item, dict) and item.get("name"):
                    slug = item.get("slug", item["name"].lower())
                    if slug not in seen_slugs:
                        seen_slugs.add(slug)
                        companies.append(CompanyTag(name=item["name"], slug=slug))

        return companies

    def _parse_similar_questions(self, raw_sim: Any) -> List[RelatedProblem]:
        """Parse `similarQuestions` into a list of `RelatedProblem` instances."""

        if not raw_sim:
            return []

        sim_list = raw_sim
        if isinstance(raw_sim, str):
            try:
                sim_list = json.loads(raw_sim)
            except Exception:
                return []

        problems: List[RelatedProblem] = []
        if isinstance(sim_list, list):
            for item in sim_list:
                if isinstance(item, dict) and item.get("title"):
                    problems.append(
                        RelatedProblem(
                            title=item["title"],
                            title_slug=item.get("titleSlug", item.get("slug", "")),
                            difficulty=item.get("difficulty", "Medium"),
                        )
                    )
        return problems
