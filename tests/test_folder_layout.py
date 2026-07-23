"""Unit tests for problem folder layout strategies."""

from __future__ import annotations

import unittest
from pathlib import Path
import sys

SERVER_DIR = Path(__file__).resolve().parents[1] / "server"
if str(SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(SERVER_DIR))

from config.folder_layout import (
    DifficultyNumberLayout,
    DifficultyNumberTitleLayout,
    DifficultyTitleLayout,
    NumberLayout,
    NumberTitleLayout,
    get_folder_layout_strategy,
)


class FolderLayoutTests(unittest.TestCase):
    def test_difficulty_number_title_layout(self) -> None:
        strategy = get_folder_layout_strategy("difficulty-number-title")
        self.assertIsInstance(strategy, DifficultyNumberTitleLayout)
        res = strategy.get_relative_folder_path(3513, "Number of Unique XOR Triplets I", "Medium")
        self.assertEqual(res.as_posix(), "Medium/3513-Number of Unique XOR Triplets I")

    def test_number_title_layout(self) -> None:
        strategy = get_folder_layout_strategy("number-title")
        self.assertIsInstance(strategy, NumberTitleLayout)
        res = strategy.get_relative_folder_path(3513, "Number of Unique XOR Triplets I", "Medium")
        self.assertEqual(res.as_posix(), "3513-Number of Unique XOR Triplets I")

    def test_number_layout(self) -> None:
        strategy = get_folder_layout_strategy("number")
        self.assertIsInstance(strategy, NumberLayout)
        res = strategy.get_relative_folder_path(3513, "Number of Unique XOR Triplets I", "Medium")
        self.assertEqual(res.as_posix(), "3513")

    def test_difficulty_title_layout(self) -> None:
        strategy = get_folder_layout_strategy("difficulty-title")
        self.assertIsInstance(strategy, DifficultyTitleLayout)
        res = strategy.get_relative_folder_path(3513, "Number of Unique XOR Triplets I", "Medium")
        self.assertEqual(res.as_posix(), "Medium/Number of Unique XOR Triplets I")

    def test_difficulty_number_layout(self) -> None:
        strategy = get_folder_layout_strategy("difficulty-number")
        self.assertIsInstance(strategy, DifficultyNumberLayout)
        res = strategy.get_relative_folder_path(3513, "Number of Unique XOR Triplets I", "Medium")
        self.assertEqual(res.as_posix(), "Medium/3513")

    def test_unknown_layout_falls_back_to_default(self) -> None:
        strategy = get_folder_layout_strategy("nonexistent-layout")
        self.assertIsInstance(strategy, DifficultyNumberTitleLayout)


if __name__ == "__main__":
    unittest.main()
