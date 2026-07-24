"""Central synchronization engine for idempotent and incremental updates with structured logging and telemetry."""

from __future__ import annotations

import hashlib
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


class SourceIntegrityError(ValueError):
    """Raised when source integrity or SHA-256 hash validation fails."""


logger = logging.getLogger(__name__)


def _get_extension(language: str) -> str:
    """Map programming language to appropriate file extension."""
    mapping = {
        "cpp": ".cpp",
        "c++": ".cpp",
        "java": ".java",
        "python": ".py",
        "python3": ".py",
        "javascript": ".js",
        "typescript": ".ts",
        "csharp": ".cs",
        "c#": ".cs",
        "golang": ".go",
        "go": ".go",
        "rust": ".rs",
        "swift": ".swift",
        "kotlin": ".kt",
        "ruby": ".rb",
        "c": ".c",
        "scala": ".scala",
        "php": ".php",
    }
    return mapping.get(language.lower(), ".txt")


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

        # Phase 3: Defensive Conditional Source Integrity & SHA-256 Hash Verification
        source_hash = getattr(submission, "source_hash", None)
        computed_hash = None
        if source_hash:
            computed_hash = hashlib.sha256(submission.code.encode("utf-8")).hexdigest()
            if source_hash.lower() != computed_hash.lower():
                raise SourceIntegrityError(
                    f"Source integrity SHA-256 verification failed! Expected payload hash '{source_hash}', computed '{computed_hash}'."
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

                # Post-write filesystem SHA-256 source integrity check if source_hash present
                if source_hash and computed_hash:
                    written_code = solution_path.read_text(encoding="utf-8")
                    written_hash = hashlib.sha256(written_code.encode("utf-8")).hexdigest()
                    if written_hash.lower() != computed_hash.lower():
                        raise SourceIntegrityError(
                            f"Filesystem source integrity SHA-256 mismatch! Expected '{computed_hash}', written '{written_hash}'."
                        )

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

            if self.config.repository.auto_generate_dashboard:
                t_dash_start = time.perf_counter()
                root_readme_content = generator.generate_root_readme(all_problems, statistics)
                root_readme_path = self.repo_root / "README.md"
                if self.change_detector.detect_file_change(root_readme_path, root_readme_content):
                    snapshot.record_file(root_readme_path)
                    _atomic_write(root_readme_path, root_readme_content)
                    self.change_detector.record_change(root_readme_path, root_readme_content)
                    changed_files.append("README.md")
                    logger.info("[EVENT:ROOT_README_UPDATED]", extra={"event": "ROOT_README_UPDATED"})
                self.metrics.record_dashboard_duration((time.perf_counter() - t_dash_start) * 1000)

            if self.config.repository.auto_generate_topics:
                t_topic_start = time.perf_counter()
                topic_pages = generator.generate_topic_pages(all_problems)
                for rel_topic_path, topic_content in topic_pages.items():
                    full_topic_path = self.repo_root / rel_topic_path
                    if self.change_detector.detect_file_change(full_topic_path, topic_content):
                        snapshot.record_file(full_topic_path)
                        _atomic_write(full_topic_path, topic_content)
                        self.change_detector.record_change(full_topic_path, topic_content)
                        changed_files.append(rel_topic_path.as_posix())
                        logger.info("[EVENT:TOPIC_PAGE_UPDATED]", extra={"event": "TOPIC_PAGE_UPDATED", "topic_path": rel_topic_path.as_posix()})
                self.metrics.record_topic_duration((time.perf_counter() - t_topic_start) * 1000)

            # 6. Execute planned Git Operations (Stage -> Commit -> Push)
            branch = self.git_service.get_current_branch().get("branch", "main")
            git_result: Dict[str, Any] = {"status": "no_changes", "committed": False, "pushed": False}

            if not changed_files and not self.git_service.get_status().get("clean", True):
                git_result["status"] = "staged_only"

            if not changed_files:
                self.metrics.record_sync_complete(start_time, success=True)
                rel_out = (relative_folder / solution_path.name).as_posix()
                rel_read = (relative_folder / readme_path.name).as_posix()
                logger.info(
                    "[EVENT:SYNC_COMPLETED]",
                    extra={
                        "event": "SYNC_COMPLETED",
                        "problem_number": submission.id,
                        "status": "no_changes",
                        "duration_ms": round((time.perf_counter() - start_time) * 1000, 2),
                    },
                )
                return {
                    "status": "no_changes",
                    "problem": {"id": submission.id, "title": submission.title},
                    "output_file": rel_out,
                    "readme_file": rel_read,
                    "repository_path": str(self.repo_root),
                    "solution_path": str(solution_path),
                    "readme_path": str(readme_path),
                    "changed": False,
                    "changed_files": [],
                    "git": git_result,
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
                        "committed": True,
                        "pushed": pushed,
                        "commit": commit_hash,
                        "branch": branch,
                    }
                except GitServiceError as exc:
                    git_result = {"status": "error", "error": exc.to_dict()}
                    logger.error(f"[SYNC] Git error during commit: {exc.message}")
            else:
                git_result["status"] = "staged_only"

            rel_solution = (relative_folder / solution_path.name).as_posix()
            rel_readme = (relative_folder / readme_path.name).as_posix()
            sync_duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            self.metrics.record_sync_complete(start_time, success=True)
            logger.info(
                "[EVENT:SYNC_COMPLETED]",
                extra={
                    "event": "SYNC_COMPLETED",
                    "problem_number": submission.id,
                    "status": "created" if is_new_problem else "updated",
                    "duration_ms": sync_duration_ms,
                },
            )

            return {
                "status": "created" if is_new_problem else "updated",
                "problem": {"id": submission.id, "title": submission.title},
                "output_file": rel_solution,
                "readme_file": rel_readme,
                "repository_path": str(self.repo_root),
                "solution_path": str(solution_path),
                "readme_path": str(readme_path),
                "changed": True,
                "changed_files": changed_files,
                "git": git_result,
            }
        except Exception as exc:
            snapshot.rollback()
            self.metrics.record_sync_complete(start_time, success=False)
            logger.error(
                "[EVENT:SYNC_FAILED]",
                extra={
                    "event": "SYNC_FAILED",
                    "problem_number": submission.id,
                    "error": str(exc),
                },
            )
            raise
