"""Unit tests for FileDiff and normalized content comparison."""

import sys
from pathlib import Path

SERVER_DIR = Path(__file__).resolve().parents[1] / "server"
if str(SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(SERVER_DIR))

import pytest
from sync.file_diff import FileDiff, compute_sha256, normalize_content


def test_normalize_content_crlf_and_trailing_whitespace():
    raw = "def foo():\r\n    return 42   \r\n\r\n"
    expected = "def foo():\n    return 42\n"
    assert normalize_content(raw) == expected


def test_normalize_content_empty():
    assert normalize_content("") == ""
    assert normalize_content("\r\n\n   \n") == ""


def test_compute_sha256_consistency():
    content_lf = "line1\nline2\n"
    content_crlf = "line1  \r\nline2\r\n"
    assert compute_sha256(content_lf) == compute_sha256(content_crlf)


def test_has_semantic_change_whitespace_only():
    existing = "class Solution {\npublic:\n    int foo() { return 1; }\n};\n"
    new_crlf = "class Solution {\r\npublic:   \r\n    int foo() { return 1; }\r\n};\r\n\r\n"
    assert not FileDiff.has_semantic_change(existing, new_crlf)


def test_has_semantic_change_code_modified():
    existing = "def solve(): return 1\n"
    new_code = "def solve(): return 2\n"
    assert FileDiff.has_semantic_change(existing, new_code)


def test_has_semantic_change_none_existing():
    assert FileDiff.has_semantic_change(None, "content")
    assert not FileDiff.has_semantic_change(None, "   \n")
