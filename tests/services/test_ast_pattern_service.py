"""Pytest suite for Python ASTPatternAnalyzer service."""

from pathlib import Path
from server.services.ast_pattern_service import ASTPatternAnalyzer


def test_ast_pattern_analyzer_default() -> None:
    """Verify ASTPatternAnalyzer returns default pattern frequencies when repo path is empty."""
    analyzer = ASTPatternAnalyzer()
    res = analyzer.analyze_repository()

    assert "pattern_frequency" in res
    assert "DFS Traversal" in res["pattern_frequency"]
    assert res["total_files_analyzed"] >= 42


def test_ast_pattern_analyzer_python_ast() -> None:
    """Verify ASTPatternAnalyzer parses Python AST for loop and recursion structural patterns."""
    analyzer = ASTPatternAnalyzer()
    python_code = """
def solve(n):
    if n <= 1:
        return n
    return solve(n-1) + solve(n-2)
"""
    patterns = analyzer.analyze_python_ast(python_code)
    assert "Recursion" in patterns
