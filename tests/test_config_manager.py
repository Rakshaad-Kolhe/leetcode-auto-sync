"""Unit tests for the ConfigManager and configuration schemas."""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path
import sys

SERVER_DIR = Path(__file__).resolve().parents[1] / "server"
if str(SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(SERVER_DIR))

from config.config_manager import (
    AppConfig,
    ConfigManager,
    DocumentationConfig,
    GitConfig,
    MetadataConfig,
    RepositoryConfig,
)


class ConfigManagerTests(unittest.TestCase):
    def setUp(self) -> None:
        ConfigManager.reset_instance()

    def tearDown(self) -> None:
        ConfigManager.reset_instance()

    def test_default_config_loading(self) -> None:
        manager = ConfigManager()
        cfg = manager.get_config()

        self.assertIsInstance(cfg, AppConfig)
        self.assertEqual(cfg.repository.folder_layout, "difficulty-number-title")
        self.assertTrue(cfg.repository.auto_generate_readme)
        self.assertTrue(cfg.repository.auto_generate_topics)
        self.assertTrue(cfg.repository.auto_generate_dashboard)

        self.assertEqual(cfg.documentation.template, "classic")
        self.assertTrue(cfg.documentation.difficulty_badges)
        self.assertTrue(cfg.documentation.language_badges)
        self.assertTrue(cfg.documentation.show_acceptance)

        self.assertTrue(cfg.git.auto_commit)
        self.assertTrue(cfg.git.auto_push)
        self.assertEqual(cfg.git.commit_message, "Add {problem_number} - {problem_title}")

        self.assertTrue(cfg.metadata.enable_graphql)
        self.assertEqual(cfg.metadata.cache_days, 30)

    def test_user_config_overrides(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_dir = Path(tmp)
            user_config_file = tmp_dir / "config.json"
            user_config_file.write_text(
                json.dumps(
                    {
                        "repository": {"folder_layout": "number-title"},
                        "documentation": {"template": "minimal", "difficulty_badges": False},
                        "git": {"commit_message": "Solve {problem_number}"},
                        "metadata": {"cache_days": 14},
                    }
                ),
                encoding="utf-8",
            )

            manager = ConfigManager(user_path=user_config_file)
            cfg = manager.get_config()

            self.assertEqual(cfg.repository.folder_layout, "number-title")
            # Unspecified defaults should be preserved
            self.assertTrue(cfg.repository.auto_generate_readme)
            self.assertEqual(cfg.documentation.template, "minimal")
            self.assertFalse(cfg.documentation.difficulty_badges)
            self.assertTrue(cfg.documentation.language_badges)
            self.assertEqual(cfg.git.commit_message, "Solve {problem_number}")
            self.assertEqual(cfg.metadata.cache_days, 14)

    def test_missing_config_falls_back_to_defaults(self) -> None:
        missing_file = Path("/path/to/nonexistent_config.json")
        manager = ConfigManager(user_path=missing_file)
        cfg = manager.get_config()

        self.assertEqual(cfg.repository.folder_layout, "difficulty-number-title")
        self.assertEqual(cfg.documentation.template, "classic")

    def test_invalid_json_falls_back_to_defaults(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_dir = Path(tmp)
            invalid_file = tmp_dir / "bad_config.json"
            invalid_file.write_text("NOT A VALID JSON {{{", encoding="utf-8")

            manager = ConfigManager(user_path=invalid_file)
            cfg = manager.get_config()

            self.assertEqual(cfg.repository.folder_layout, "difficulty-number-title")
            self.assertTrue(cfg.git.auto_commit)

    def test_invalid_data_types_coerced_or_defaulted(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_dir = Path(tmp)
            type_err_file = tmp_dir / "type_err.json"
            type_err_file.write_text(
                json.dumps(
                    {
                        "metadata": {"cache_days": "invalid_int"},
                        "repository": {"auto_generate_readme": 1},
                    }
                ),
                encoding="utf-8",
            )

            manager = ConfigManager(user_path=type_err_file)
            cfg = manager.get_config()

            self.assertEqual(cfg.metadata.cache_days, 30)
            self.assertTrue(cfg.repository.auto_generate_readme)

    def test_repo_root_config_discovery(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            repo_root = Path(tmp)
            (repo_root / ".git").mkdir()
            config_file = repo_root / "config.json"
            config_file.write_text(
                json.dumps({"documentation": {"template": "detailed"}}),
                encoding="utf-8",
            )

            manager = ConfigManager(repo_root=repo_root)
            cfg = manager.get_config()

            self.assertEqual(cfg.documentation.template, "detailed")


if __name__ == "__main__":
    unittest.main()
