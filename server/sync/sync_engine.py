"""Central synchronization engine for idempotent and incremental updates with structured logging and telemetry."""

from __future__ import annotations

import logging
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

from config import LEETCODE_REPO_PATH
from config.config_manager import AppConfig, ConfigManager
from config.folder_layout import get_folder_layout_strategy, sanitize_filename
from documentation.generator import DocumentationGenerator
from documentation.models import ProblemMetadata
from documentation.statistics import generate_statistics, scan_repository
from git_service import GitService, GitServiceError
from metadata.metadata_service import MetadataService
from metrics import MetricsCollector
from repository_writer import _atomic_write, _current_timestamp, _leetcode_url, _read_existing_timestamp, validate_repository
from schemas import Submission

from .change_detector import ChangeDetector
from .commit_planner import CommitPlanner
from .file_diff import FileDiff
from .repository_state import RepositoryState, build_repository_state
from .snapshot import TransactionSnapshot

logger = logging.getLogger(__name__)


class SyncEngine:
    """Orchestrates intelligent, idempotent, and incremental repository synchronization."""

    def __init__(
        self,
        repo_root: Path | str | None = None,
        config: AppConfig | ConfigManager | None = None,
        git_service: Optional[GitService] = None,
        metadata_service: Optional[MetadataService] = None,
        metrics_collector: Optional[MetricsCollector] = None,
    ) -> None:
        self.repo_root = Path(repo_root or LEETCODE_REPO_PATH).expanduser().resolve()
        validate_repository(self.repo_root)

        if isinstance(config, AppConfig):
            self.config = config
        elif isinstance(config, ConfigManager):
            self.config = config.get_config()
        else:
            self.config = ConfigManager.get_instance(repo_root=self.repo_root).get_config()

        self.change_detector = ChangeDetector(self.repo_root)
        self.git_service = git_service or GitService(repo_path=self.repo_root, config=self.config)
        self.metadata_service = metadata_service or MetadataService(repo_root=self.repo_root, config=self.config)
        self.commit_planner = CommitPlanner(self.git_service)
        self.metrics = metrics_collector or MetricsCollector.get_instance()

    def get_state(self) -> RepositoryState:
        """Scan local repository and return current immutable state."""
        return build_repository_state(self.repo_root)

    def sync_submission(self, submission: Submission) -> Dict[str, Any]:
        """Synchronize a problem submission with idempotent change detection and transaction rollback."""
        start_time = self.metrics.record_sync_start()
        snapshot = TransactionSnapshot(self.repo_root)

        logger.info(
            "[EVENT:SYNC_STARTED]",
            extra={
                "event": "SYNC_STARTED",
                "problem_number": submission.id,
                "problem_slug": submission.slug,
                "language": submission.language,
            },
        )

        try:
            state = self.get_state()
            is_new_problem = submission.id not in state.solved_problem_ids

            # 1. Determine folder layout path
            strategy = get_folder_layout_strategy(self.config.repository.folder_layout)
            relative_folder = strategy.get_relative_folder_path(
                submission.id, submission.title, submission.difficulty, submission.language
            )
            problem_folder = self.repo_root / relative_folder
            sanitized_title = sanitize_filename(submission.title)

            # Legacy migration: difficulty/title -> difficulty/0001-title
            if self.config.repository.folder_layout == "difficulty-number-title":
                legacy_folder = self.repo_root / submission.difficulty / sanitized_title
                if legacy_folder.exists() and not problem_folder.exists():
                    snapshot.record_file(legacy_folder)
                    snapshot.record_file(problem_folder)
                    legacy_folder.rename(problem_folder)

            extension = _get_extension(submission.language)
            solution_path = problem_folder / f"solution{extension}"
            readme_path = problem_folder / "README.md"

            # 2. Check for duplicate submission fast-path
            if not is_new_problem and solution_path.exists():
                existing_code = solution_path.read_text(encoding="utf-8")
                if not FileDiff.has_semantic_change(existing_code, submission.code):
                    if not self.config.repository.auto_generate_readme or (
                        readme_path.exists() and not self.change_detector.detect_file_change(readme_path, readme_path.read_text(encoding="utf-8"))
                    ):
                        self.metrics.record_cache_hit()
                        self.metrics.record_sync_complete(start_time, success=True)
                        logger.info(
                            "[EVENT:FILES_SKIPPED]",
                            extra={"event": "FILES_SKIPPED", "problem_number": submission.id, "reason": "duplicate_submission"},
                        )
                        logger.info(
                            "[EVENT:SYNC_COMPLETED]",
                            extra={
                                "event": "SYNC_COMPLETED",
                                "problem_number": submission.id,
                                "status": "no_changes",
                                "duration_ms": round((time.perf_counter() - start_time) * 1000, 2),
                            },
                        )
                        rel_solution = (relative_folder / solution_path.name).as_posix()
                        rel_readme = (relative_folder / readme_path.name).as_posix()
                        return {
                            "status": "no_changes",
                            "problem": {"id": submission.id, "title": submission.title},
                            "output_file": rel_solution,
                            "readme_file": rel_readme,
                            "repository_path": str(self.repo_root),
                            "solution_path": str(solution_path),
                            "readme_path": str(readme_path),
                            "changed": False,
                            "git": {"status": "no_changes"},
                            "message": "Duplicate submission detected. Nothing changed.",
                        }

            self.metrics.record_cache_miss()

            # 3. Fetch metadata & prepare ProblemMetadata
            t_meta_start = time.perf_counter()
            existing_code = solution_path.read_text(encoding="utf-8") if solution_path.exists() else None
            existing_readme = readme_path.read_text(encoding="utf-8") if readme_path.exists() else None
            generated_at = _read_existing_timestamp(readme_path) if existing_code == submission.code else None

            enriched = self.metadata_service.get_metadata(
                submission.slug,
                problem_number=submission.id,
                title=submission.title,
                difficulty=submission.difficulty,
            )
            self.metrics.record_metadata_duration((time.perf_counter() - t_meta_start) * 1000)
            logger.info("[EVENT:METADATA_FETCHED]", extra={"event": "METADATA_FETCHED", "problem_number": submission.id})

            metadata = ProblemMetadata(
                problem_number=submission.id,
                title=submission.title,
                slug=submission.slug,
                difficulty=submission.difficulty,
                language=submission.language,
                url=_leetcode_url(submission.slug),
                generated_at=generated_at or _current_timestamp(),
                folder=relative_folder,
                topics=enriched.topic_names(),
                companies=enriched.company_names(),
                acceptance_rate=enriched.acceptance_rate,
                likes=enriched.likes,
                dislikes=enriched.dislikes,
                hints=enriched.hints,
                similar_questions=[
                    {"title": r.title, "title_slug": r.title_slug, "difficulty": r.difficulty}
                    for r in enriched.similar_questions
                ],
            )

            generator = DocumentationGenerator(self.config)
            problem_readme = None
            if self.config.repository.auto_generate_readme:
                t_readme_start = time.perf_counter()
                problem_readme = generator.generate_problem_readme(metadata, submission.code)
                self.metrics.record_readme_duration((time.perf_counter() - t_readme_start) * 1000)
                logger.info("[EVENT:README_GENERATED]", extra={"event": "README_GENERATED", "problem_number": submission.id})

            # 4. Perform change detection for solution & problem README
            solution_changed = self.change_detector.detect_file_change(solution_path, submission.code)
            readme_changed = (
                self.change_detector.detect_file_change(readme_path, problem_readme)
                if (problem_readme is not None)
                else False
            )

            changed_files: List[str] = []

            if solution_changed:
                snapshot.record_file(solution_path)
                _atomic_write(solution_path, submission.code)
                self.change_detector.record_change(solution_path, submission.code)
                changed_files.append((relative_folder / solution_path.name).as_posix())

            if readme_changed and problem_readme is not None:
                snapshot.record_file(readme_path)
                _atomic_write(readme_path, problem_readme)
                self.change_detector.record_change(readme_path, problem_readme)
                changed_files.append((relative_folder / readme_path.name).as_posix())

            if changed_files:
                logger.info(
                    "[EVENT:FILES_UPDATED]",
                    extra={"event": "FILES_UPDATED", "problem_number": submission.id, "file_count": len(changed_files)},
                )

            # 5. Incremental documentation generation (Root Dashboard & Affected Topics)
            all_problems = scan_repository(self.repo_root)
            statistics = generate_statistics(all_problems)

            dashboard_changed = False
            if self.config.repository.auto_generate_dashboard:
                root_readme_path = self.repo_root / "README.md"
                new_root_readme = generator.generate_repository_readme(all_problems, statistics)
                if self.change_detector.detect_file_change(root_readme_path, new_root_readme):
                    snapshot.record_file(root_readme_path)
                    _atomic_write(root_readme_path, new_root_readme)
                    self.change_detector.record_change(root_readme_path, new_root_readme)
                    changed_files.append("README.md")
                    dashboard_changed = True

            topics_updated_count = 0
            if self.config.repository.auto_generate_topics and metadata.topics:
                affected_topics = metadata.topics
                topics_dir = self.repo_root / "Topics"
                topics_dir.mkdir(parents=True, exist_ok=True)

                topics_map: Dict[str, List[ProblemMetadata]] = {}
                for prob in all_problems:
                    for top in prob.topics:
                        topics_map.setdefault(top, []).append(prob)

                for topic_name in affected_topics:
                    topic_probs = topics_map.get(topic_name, [])
                    if topic_probs:
                        topic_content = generator.generate_topic_page(topic_name, topic_probs)
                        topic_file = topics_dir / f"{topic_name}.md"
                        if self.change_detector.detect_file_change(topic_file, topic_content):
                            snapshot.record_file(topic_file)
                            _atomic_write(topic_file, topic_content)
                            self.change_detector.record_change(topic_file, topic_content)
                            rel_topic = (Path("Topics") / f"{topic_name}.md").as_posix()
                            if rel_topic not in changed_files:
                                changed_files.append(rel_topic)
                            topics_updated_count += 1
                            logger.info(
                                "[EVENT:TOPIC_UPDATED]",
                                extra={"event": "TOPIC_UPDATED", "topic": topic_name},
                            )

            # 6. Plan commit and execute Git operations
            git_result: Dict[str, Any] = {"status": "no_changes"}
            branch = "main"

            try:
                branch_info = self.git_service.get_current_branch()
                branch = branch_info["branch"]
            except GitServiceError as exc:
                logger.error(f"[SYNC] Git branch error: {exc}")
                self.metrics.record_sync_complete(start_time, success=False)
                rel_out = (relative_folder / solution_path.name).as_posix()
                rel_read = (relative_folder / readme_path.name).as_posix()
                return {
                    "status": "created" if is_new_problem else "updated",
                    "problem": {"id": submission.id, "title": submission.title},
                    "output_file": rel_out,
                    "readme_file": rel_read,
                    "repository_path": str(self.repo_root),
                    "solution_path": str(solution_path),
                    "readme_path": str(readme_path),
                    "changed": bool(changed_files),
                    "changed_files": changed_files,
                    "git": {"status": "error", "error": exc.to_dict()},
                }

            commit_plan = self.commit_planner.plan(submission, changed_files, is_new_problem=is_new_problem)
            git_result["branch"] = branch

            if commit_plan.should_commit:
                try:
                    t_stage = time.perf_counter()
                    staged = self.git_service.stage_changes()
                    self.metrics.record_git_stage_duration((time.perf_counter() - t_stage) * 1000)

                    t_commit = time.perf_counter()
                    commit_res = self.git_service.commit_changes(commit_plan.commit_message or "")
                    self.metrics.record_git_commit_duration((time.perf_counter() - t_commit) * 1000)
                    commit_hash = commit_res.get("commit", "") if isinstance(commit_res, dict) else "unknown"
                    logger.info(
                        "[EVENT:GIT_COMMIT_CREATED]",
                        extra={"event": "GIT_COMMIT_CREATED", "commit": commit_hash},
                    )

                    pushed = False
                    if commit_plan.should_push:
                        t_push = time.perf_counter()
                        self.git_service.push_changes(branch)
                        self.metrics.record_git_push_duration((time.perf_counter() - t_push) * 1000)
                        pushed = True
                        logger.info(
                            "[EVENT:GIT_PUSH_COMPLETED]",
                            extra={"event": "GIT_PUSH_COMPLETED", "branch": branch},
                        )

                    git_result = {
                        "status": "committed",
                        "branch": branch,
                        "commit": commit_hash,
                        "pushed": pushed,
                        "files": staged.get("files", []),
                    }
                except GitServiceError as exc:
                    logger.error(f"[SYNC] Git error during commit: {exc}")
                    git_result = {"status": "error", "branch": branch, "error": exc.to_dict()}
            elif changed_files:
                try:
                    staged = self.git_service.stage_changes()
                    git_result = {"status": "staged_only", "branch": branch, "files": staged.get("files", [])}
                except GitServiceError as exc:
                    git_result = {"status": "error", "branch": branch, "error": exc.to_dict()}

            self.metrics.record_sync_complete(start_time, success=True)
            duration_total = round((time.perf_counter() - start_time) * 1000, 2)

            logger.info(
                "[EVENT:SYNC_COMPLETED]",
                extra={
                    "event": "SYNC_COMPLETED",
                    "problem_number": submission.id,
                    "status": "created" if is_new_problem else ("updated" if changed_files else "no_changes"),
                    "duration_ms": duration_total,
                },
            )

            rel_output = (relative_folder / solution_path.name).as_posix()
            rel_readme = (relative_folder / readme_path.name).as_posix()

            return {
                "status": "created" if is_new_problem else ("updated" if changed_files else "no_changes"),
                "problem": {"id": submission.id, "title": submission.title},
                "output_file": rel_output,
                "readme_file": rel_readme,
                "repository_path": str(self.repo_root),
                "solution_path": str(solution_path),
                "readme_path": str(readme_path),
                "changed": bool(changed_files),
                "changed_files": changed_files,
                "git": git_result,
            }

        except Exception as exc:
            self.metrics.record_sync_complete(start_time, success=False)
            snapshot.rollback()
            logger.error(
                "[EVENT:SYNC_FAILED]",
                extra={
                    "event": "SYNC_FAILED",
                    "problem_number": submission.id,
                    "error": str(exc),
                    "duration_ms": round((time.perf_counter() - start_time) * 1000, 2),
                },
            )
            raise exc


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
