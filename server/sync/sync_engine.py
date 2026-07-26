"""Central synchronization engine for idempotent and incremental updates with structured logging and telemetry."""

from __future__ import annotations

import hashlib
import logging
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

from server.config import LEETCODE_REPO_PATH
from server.config.config_manager import AppConfig, ConfigManager
from server.config.folder_layout import get_folder_layout_strategy, sanitize_filename
from server.documentation.generator import DocumentationGenerator
from server.documentation.models import ProblemMetadata
from server.documentation.statistics import generate_statistics, scan_repository
from server.git_service import (
    GitService,
    GitServiceError,
    RepositoryStatus,
    RepositoryDivergedError,
    DirtyWorkingTreeError,
    DetachedHeadError,
    FastForwardFailedError,
    InvalidRepositoryError,
)
from server.metadata.metadata_service import MetadataService
from server.metrics import MetricsCollector
from server.repository_writer import _atomic_write, _current_timestamp, _leetcode_url, _read_existing_timestamp, validate_repository
from server.schemas import Submission


from .change_detector import ChangeDetector
from .commit_planner import CommitPlanner
from .file_diff import FileDiff
from .repository_state import RepositoryState, build_repository_state
from .snapshot import TransactionSnapshot


class SourceIntegrityError(ValueError):
    """Raised when source integrity or SHA-256 hash validation fails."""


class MetadataIntegrityError(ValueError):
    """Raised when problem metadata (title, slug, frontend_id) is inconsistent or mixed."""


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

        # Generate or retain trace_id
        trace_id = submission.trace_id
        if not trace_id:
            from datetime import datetime, timezone
            import uuid
            date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
            rand_str = uuid.uuid4().hex[:8]
            trace_id = f"SYNC-{date_str}-{rand_str}"
        submission.trace_id = trace_id

        logger.info(
            "[EVENT:SYNC_STARTED]",
            extra={
                "event": "SYNC_STARTED",
                "problem_number": submission.id,
                "problem_slug": submission.slug,
                "language": submission.language,
                "trace_id": trace_id,
            },
        )

        # Phase 4 & 8: Metadata Integrity & Consistency Verification
        slug_tokens = set(submission.slug.lower().split("-"))
        normalized_title = "".join(c if c.isalnum() else "-" for c in submission.title.lower())
        title_tokens = set(filter(None, normalized_title.split("-")))
        slug_non_num = {t for t in slug_tokens if not t.isdigit()}
        title_non_num = {t for t in title_tokens if not t.isdigit()}
        if slug_non_num and title_non_num and not slug_non_num.intersection(title_non_num):
            raise MetadataIntegrityError(
                f"Metadata integrity check failed! Title '{submission.title}' does not match slug '{submission.slug}'."
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
            # 0. Pre-Write Git Repository Validation & State Analysis
            branch = "main"
            try:
                branch_info = self.git_service.get_current_branch()
                branch = branch_info["branch"]
            except DetachedHeadError:
                logger.error("[EVENT:SYNC_ABORTED_DETACHED_HEAD]")
                raise
            except GitServiceError:
                pass

            repo_state = self.git_service.analyze_repository(branch=branch)
            if repo_state.status == RepositoryStatus.NOT_GIT_REPOSITORY:
                raise InvalidRepositoryError(f"Path is not a valid Git repository: {self.repo_root}")
            if repo_state.status == RepositoryStatus.DETACHED_HEAD:
                logger.error("[EVENT:SYNC_ABORTED_DETACHED_HEAD]")
                raise DetachedHeadError("Repository is in detached HEAD state. Synchronization aborted before file writes.")
            if repo_state.status == RepositoryStatus.DIRTY:
                logger.error("[EVENT:SYNC_ABORTED_DIRTY_WORKTREE]")
                raise DirtyWorkingTreeError(f"Repository contains uncommitted changes on branch '{branch}'. Synchronization aborted before file writes.")
            if repo_state.status == RepositoryStatus.DIVERGED:
                logger.error("[EVENT:SYNC_ABORTED_REPOSITORY_DIVERGED]")
                raise RepositoryDivergedError(
                    f"Local and remote branch '{branch}' have diverged (ahead: {repo_state.ahead}, behind: {repo_state.behind}). Synchronization aborted before file writes."
                )
            if repo_state.status == RepositoryStatus.BEHIND:
                self.git_service.fast_forward_pull(branch=branch)

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
                            extra={"event": "FILES_SKIPPED", "problem_number": submission.id, "reason": "duplicate_submission", "trace_id": trace_id},
                        )
                        logger.info(
                            "[EVENT:SYNC_COMPLETED]",
                            extra={
                                "event": "SYNC_COMPLETED",
                                "problem_number": submission.id,
                                "status": "no_changes",
                                "duration_ms": round((time.perf_counter() - start_time) * 1000, 2),
                                "trace_id": trace_id,
                            },
                        )
                        rel_solution = (relative_folder / solution_path.name).as_posix()
                        rel_readme = (relative_folder / readme_path.name).as_posix()
                        return {
                            "status": "no_changes",
                            "trace_id": trace_id,
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

            # 3. Fetch metadata & verify metadata consistency
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
            # Cross-verify metadata sources
            self.metadata_service.verify_metadata_consistency(
                submission.id, submission.title, submission.slug, enriched
            )

            self.metrics.record_metadata_duration((time.perf_counter() - t_meta_start) * 1000)
            logger.info("[EVENT:METADATA_FETCHED]", extra={"event": "METADATA_FETCHED", "problem_number": submission.id, "trace_id": trace_id})

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
                trace_id=trace_id,
            )

            generator = DocumentationGenerator(self.config)
            problem_readme = None
            if self.config.repository.auto_generate_readme:
                t_readme_start = time.perf_counter()
                problem_readme = generator.generate_problem_readme(metadata, submission.code)
                # Verify generated README contains valid metadata
                if submission.title and submission.title not in problem_readme:
                    raise ValueError(f"README verification failed: title '{submission.title}' missing from generated README.")
                self.metrics.record_readme_duration((time.perf_counter() - t_readme_start) * 1000)
                logger.info("[EVENT:README_GENERATED]", extra={"event": "README_GENERATED", "problem_number": submission.id, "trace_id": trace_id})

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
                root_readme_content = generator.generate_repository_readme(all_problems, statistics)
                root_readme_path = self.repo_root / "README.md"
                if self.change_detector.detect_file_change(root_readme_path, root_readme_content):
                    snapshot.record_file(root_readme_path)
                    _atomic_write(root_readme_path, root_readme_content)
                    self.change_detector.record_change(root_readme_path, root_readme_content)
                    changed_files.append("README.md")
                    logger.info("[EVENT:ROOT_README_UPDATED]", extra={"event": "ROOT_README_UPDATED"})

            if self.config.repository.auto_generate_topics:
                t_topic_start = time.perf_counter()
                topic_paths = regenerate_topic_pages(self.repo_root, all_problems, generator)
                for tp in topic_paths:
                    try:
                        rel = tp.relative_to(self.repo_root).as_posix()
                        if rel not in changed_files:
                            changed_files.append(rel)
                    except ValueError:
                        pass

            # 6. Execute planned Git Operations (Stage -> Commit -> Push)

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

            if commit_plan.should_commit:
                try:
                    branch = self.git_service.get_current_branch().get("branch", "main")
                    git_result["branch"] = branch
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
                "status": "created" if is_new_problem else ("updated" if changed_files else "no_changes"),
                "trace_id": trace_id,

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
