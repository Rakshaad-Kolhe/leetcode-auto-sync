"""Centralized Configuration Manager for LeetCode Auto Sync.

Handles loading, validating, merging, and strongly-typed access to application configuration.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CONFIG_PATH = PROJECT_ROOT / "config" / "default_config.json"


@dataclass
class RepositoryConfig:
    folder_layout: str = "difficulty-number-title"
    auto_generate_readme: bool = True
    auto_generate_topics: bool = True
    auto_generate_dashboard: bool = True


@dataclass
class DocumentationConfig:
    template: str = "classic"
    difficulty_badges: bool = True
    language_badges: bool = True
    show_acceptance: bool = True
    show_likes: bool = True
    show_dislikes: bool = True
    show_topics: bool = True
    show_companies: bool = True
    show_hints: bool = True
    show_timestamp: bool = True
    show_solution: bool = True


@dataclass
class GitConfig:
    auto_commit: bool = True
    auto_push: bool = True
    commit_message: str = "Add {problem_number} - {problem_title}"


@dataclass
class MetadataConfig:
    enable_graphql: bool = True
    cache_days: int = 30


@dataclass
class AppConfig:
    repository: RepositoryConfig = field(default_factory=RepositoryConfig)
    documentation: DocumentationConfig = field(default_factory=DocumentationConfig)
    git: GitConfig = field(default_factory=GitConfig)
    metadata: MetadataConfig = field(default_factory=MetadataConfig)


class ConfigManager:
    """Singleton/Manager for application configuration.

    Loads defaults from `config/default_config.json`, overlays user config if found,
    validates types, caches the result, and exposes a strongly-typed `AppConfig`.
    """

    _instance: Optional[ConfigManager] = None
    _config: Optional[AppConfig] = None

    def __init__(
        self,
        default_path: Path | str | None = None,
        user_path: Path | str | None = None,
        repo_root: Path | str | None = None,
    ) -> None:
        self.default_path = Path(default_path or DEFAULT_CONFIG_PATH).resolve()
        self.user_path = Path(user_path).resolve() if user_path else None
        self.repo_root = Path(repo_root).resolve() if repo_root else None
        self.load_config()

    @classmethod
    def get_instance(cls, repo_root: Path | str | None = None) -> ConfigManager:
        if cls._instance is None or (repo_root and cls._instance.repo_root != Path(repo_root).resolve()):
            cls._instance = ConfigManager(repo_root=repo_root)
        return cls._instance

    @classmethod
    def reset_instance(cls) -> None:
        """Reset the singleton instance (useful for testing)."""
        cls._instance = None

    def get_config(self) -> AppConfig:
        if self._config is None:
            self.load_config()
        assert self._config is not None
        return self._config

    def reload_config(
        self,
        repo_root: Path | str | None = None,
        custom_path: Path | str | None = None,
    ) -> AppConfig:
        if repo_root:
            self.repo_root = Path(repo_root).resolve()
        if custom_path:
            self.user_path = Path(custom_path).resolve()
        return self.load_config()

    def load_config(self) -> AppConfig:
        # 1. Load default dict
        default_dict = self._load_json_file(self.default_path)

        # 2. Find user config if available
        user_dict: Dict[str, Any] = {}
        target_user_path = self._resolve_user_config_path()
        if target_user_path and target_user_path.exists():
            user_dict = self._load_json_file(target_user_path)

        # 3. Merge user config over defaults
        merged_dict = self._deep_merge(default_dict, user_dict)

        # 4. Build strongly typed AppConfig with safe type conversion
        self._config = self._build_app_config(merged_dict)
        return self._config

    def _resolve_user_config_path(self) -> Optional[Path]:
        if self.user_path:
            return self.user_path
        if self.repo_root:
            candidates = [
                self.repo_root / "config.json",
                self.repo_root / ".leetcode-sync.json",
                self.repo_root / "config" / "config.json",
            ]
            for candidate in candidates:
                if candidate.exists():
                    return candidate
        # Fallback check under PROJECT_ROOT/config/config.json
        project_user_config = PROJECT_ROOT / "config" / "config.json"
        if project_user_config.exists():
            return project_user_config
        return None

    def _load_json_file(self, path: Path) -> Dict[str, Any]:
        if not path.exists():
            logger.warning(f"Config file not found: {path}. Using empty object.")
            return {}
        try:
            with open(path, "r", encoding="utf-8") as fh:
                data = json.load(fh)
                if isinstance(data, dict):
                    return data
                logger.warning(f"Invalid JSON root in {path}: expected dict, got {type(data).__name__}.")
                return {}
        except Exception as exc:
            logger.warning(f"Failed to read config file {path}: {exc}. Falling back to defaults.")
            return {}

    def _deep_merge(self, base: Dict[str, Any], override: Dict[str, Any]) -> Dict[str, Any]:
        result = dict(base)
        for key, value in override.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = self._deep_merge(result[key], value)
            else:
                result[key] = value
        return result

    def _build_app_config(self, raw: Dict[str, Any]) -> AppConfig:
        repo_raw = raw.get("repository", {}) if isinstance(raw.get("repository"), dict) else {}
        doc_raw = raw.get("documentation", {}) if isinstance(raw.get("documentation"), dict) else {}
        git_raw = raw.get("git", {}) if isinstance(raw.get("git"), dict) else {}
        meta_raw = raw.get("metadata", {}) if isinstance(raw.get("metadata"), dict) else {}

        repository = RepositoryConfig(
            folder_layout=str(repo_raw.get("folder_layout", "difficulty-number-title")),
            auto_generate_readme=bool(repo_raw.get("auto_generate_readme", True)),
            auto_generate_topics=bool(repo_raw.get("auto_generate_topics", True)),
            auto_generate_dashboard=bool(repo_raw.get("auto_generate_dashboard", True)),
        )

        documentation = DocumentationConfig(
            template=str(doc_raw.get("template", "classic")),
            difficulty_badges=bool(doc_raw.get("difficulty_badges", True)),
            language_badges=bool(doc_raw.get("language_badges", True)),
            show_acceptance=bool(doc_raw.get("show_acceptance", True)),
            show_likes=bool(doc_raw.get("show_likes", True)),
            show_dislikes=bool(doc_raw.get("show_dislikes", True)),
            show_topics=bool(doc_raw.get("show_topics", True)),
            show_companies=bool(doc_raw.get("show_companies", True)),
            show_hints=bool(doc_raw.get("show_hints", True)),
            show_timestamp=bool(doc_raw.get("show_timestamp", True)),
            show_solution=bool(doc_raw.get("show_solution", True)),
        )

        git = GitConfig(
            auto_commit=bool(git_raw.get("auto_commit", True)),
            auto_push=bool(git_raw.get("auto_push", True)),
            commit_message=str(git_raw.get("commit_message", "Add {problem_number} - {problem_title}")),
        )

        try:
            cache_days = int(meta_raw.get("cache_days", 30))
        except (ValueError, TypeError):
            cache_days = 30

        metadata = MetadataConfig(
            enable_graphql=bool(meta_raw.get("enable_graphql", True)),
            cache_days=cache_days,
        )

        return AppConfig(
            repository=repository,
            documentation=documentation,
            git=git,
            metadata=metadata,
        )
