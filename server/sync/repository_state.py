"""Immutable repository state snapshot."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

from documentation.models import ProblemMetadata
from documentation.statistics import scan_repository
from .file_diff import FileDiff


@dataclass(frozen=True)
class RepositoryState:
    """Immutable snapshot of local repository state."""

    repo_root: Path
    problems: Tuple[ProblemMetadata, ...] = field(default_factory=tuple)
    solved_problem_ids: Set[int] = field(default_factory=set)
    topic_to_problems: Dict[str, Tuple[ProblemMetadata, ...]] = field(default_factory=dict)
    company_to_problems: Dict[str, Tuple[ProblemMetadata, ...]] = field(default_factory=dict)
    difficulty_counts: Dict[str, int] = field(default_factory=dict)
    generated_file_paths: Set[str] = field(default_factory=set)
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def find_problem(self, problem_id: int) -> Optional[ProblemMetadata]:
        """Find ProblemMetadata for problem_id if present."""
        for p in self.problems:
            if p.problem_number == problem_id:
                return p
        return None

    def get_affected_topics(self, topics: List[str]) -> List[str]:
        """Return list of affected topic names."""
        return [t.strip() for t in topics if t.strip()]

    def is_duplicate_submission(
        self,
        problem_id: int,
        language: str,
        code: str,
    ) -> bool:
        """Check whether problem_id already has identical code on disk."""
        prob = self.find_problem(problem_id)
        if not prob:
            return False

        # Build path to solution file relative to repo_root
        sol_file = self.repo_root / prob.folder / f"solution{_get_extension(language)}"
        if not sol_file.exists():
            return False

        try:
            existing_code = sol_file.read_text(encoding="utf-8")
            return not FileDiff.has_semantic_change(existing_code, code)
        except Exception:
            return False


def build_repository_state(repo_root: Path | str) -> RepositoryState:
    """Scan `repo_root` and return an immutable `RepositoryState` snapshot."""
    root = Path(repo_root).expanduser().resolve()
    scanned_problems = scan_repository(root)

    solved_ids: Set[int] = set()
    topic_map: Dict[str, List[ProblemMetadata]] = {}
    company_map: Dict[str, List[ProblemMetadata]] = {}
    diff_counts: Dict[str, int] = {"Easy": 0, "Medium": 0, "Hard": 0}
    file_paths: Set[str] = set()

    for prob in scanned_problems:
        solved_ids.add(prob.problem_number)

        diff = prob.difficulty.capitalize() if prob.difficulty else "Medium"
        diff_counts[diff] = diff_counts.get(diff, 0) + 1

        for topic in prob.topics:
            topic_map.setdefault(topic, []).append(prob)

        for company in prob.companies:
            company_map.setdefault(company, []).append(prob)

        if prob.folder:
            file_paths.add((prob.folder / f"solution{_get_extension(prob.language)}").as_posix())
            file_paths.add((prob.folder / "README.md").as_posix())

    frozen_topic_map = {k: tuple(v) for k, v in topic_map.items()}
    frozen_company_map = {k: tuple(v) for k, v in company_map.items()}

    return RepositoryState(
        repo_root=root,
        problems=tuple(scanned_problems),
        solved_problem_ids=solved_ids,
        topic_to_problems=frozen_topic_map,
        company_to_problems=frozen_company_map,
        difficulty_counts=diff_counts,
        generated_file_paths=file_paths,
    )


def _get_extension(language: str) -> str:
    lang = language.strip().lower()
    ext_map = {
        "c++": ".cpp", "cpp": ".cpp", "python3": ".py", "python": ".py",
        "java": ".java", "javascript": ".js", "js": ".js", "typescript": ".ts",
        "ts": ".ts", "go": ".go", "golang": ".go", "rust": ".rs", "c": ".c",
        "csharp": ".cs", "c#": ".cs", "kotlin": ".kt", "swift": ".swift",
        "ruby": ".rb", "php": ".php", "dart": ".dart", "scala": ".scala",
        "racket": ".rkt", "erlang": ".erl", "elixir": ".ex", "sql": ".sql",
    }
    return ext_map.get(lang, ".txt")
