"""Tests for server-side Developer Intelligence calculator."""

from pathlib import Path
from server.services.developer_intelligence import DeveloperIntelligenceCalculator


def test_developer_intelligence_calculator_default() -> None:
    """Verify DeveloperIntelligenceCalculator computes valid report with defaults."""
    calc = DeveloperIntelligenceCalculator()
    report = calc.compute()

    assert "overallScore" in report
    assert 0 <= report["overallScore"] <= 100
    assert report["readinessLevel"] in ["Novice", "Intermediate", "Proficient", "Advanced", "Interview Ready"]
    assert "problemDiversity" in report["categoryScores"]
    assert "difficultyBalance" in report["categoryScores"]
    assert "consistency" in report["categoryScores"]
    assert "repositoryCompleteness" in report["categoryScores"]
    assert "contestParticipation" in report["categoryScores"]
    assert "learningProgression" in report["categoryScores"]
    assert "roadmapCompletion" in report["categoryScores"]

    assert len(report["strengths"]) > 0
    assert len(report["weaknesses"]) > 0
    assert len(report["recommendations"]) > 0
    assert report["trends"]["direction"] == "UP"


def test_developer_intelligence_calculator_custom_metrics() -> None:
    """Verify DeveloperIntelligenceCalculator respects custom metrics inputs."""
    calc = DeveloperIntelligenceCalculator()
    custom_metrics = {
        "total_solved": 150,
        "easy": 30,
        "medium": 90,
        "hard": 30,
        "current_streak": 42,
        "unique_topics": 22,
        "advanced_topics": 6,
    }
    report = calc.compute(user_metrics=custom_metrics)

    assert report["overallScore"] >= 75
    assert report["categoryScores"]["difficultyBalance"]["score"] > 80
    assert report["categoryScores"]["consistency"]["score"] > 80
