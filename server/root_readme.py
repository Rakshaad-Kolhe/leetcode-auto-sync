"""Generate the repository root README.md from the repository contents.

The generator is deterministic and overwrites the root README file every run.
"""

from __future__ import annotations

from pathlib import Path
from typing import Dict, List

from repository_scanner import scan_repository, ProblemEntry
from config import LEETCODE_REPO_PATH


# Map internal language keys and common variants to display names required by spec
LANGUAGE_DISPLAY: Dict[str, str] = {
    "cpp": "C++",
    "python3": "Python",
    "python": "Python",
    "javascript": "JavaScript",
    "typescript": "TypeScript",
    "java": "Java",
    "go": "Go",
    "rust": "Rust",
    "c": "C",
    "csharp": "C#",
    "kotlin": "Kotlin",
    "swift": "Swift",
}


def _lang_display(raw: str | None) -> str:
    if not raw:
        return "Unknown"
    key = raw.strip()
    # If value already a display name (e.g. 'C++'), try to normalise lower-case keys
    mapped = LANGUAGE_DISPLAY.get(key.lower())
    if mapped:
        return mapped
    # Maybe caller supplied a display name directly in README (like 'Python 3')
    # Normalize 'Python 3' to 'Python'
    if key.lower().startswith("python"):
        return "Python"
    return key


def generate_readme(repo_root: Path | None = None) -> Path:
    """Generate the root README.md in `repo_root` (or LEETCODE_REPO_PATH).

    Returns the Path to the written README file.
    """

    if repo_root is None:
        repo_root = Path(LEETCODE_REPO_PATH)

    problems, stats = scan_repository(repo_root)

    total = stats.get("Total", 0)
    easy = stats.get("Easy", 0)
    medium = stats.get("Medium", 0)
    hard = stats.get("Hard", 0)

    lines: List[str] = []
    lines.append("# LeetCode Solutions")
    lines.append("")
    lines.append("Automatically synced from LeetCode using my custom LeetCode Auto Sync tool.")
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## Statistics")
    lines.append("")
    lines.append("| Metric | Count |")
    lines.append("|--------|------:|")
    lines.append(f"| Total Solved | {total} |")
    lines.append(f"| Easy | {easy} |")
    lines.append(f"| Medium | {medium} |")
    lines.append(f"| Hard | {hard} |")
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## Repository Structure")
    lines.append("")
    lines.append("Easy/")
    lines.append("")
    lines.append("Medium/")
    lines.append("")
    lines.append("Hard/")
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## Problems")
    lines.append("")
    lines.append("| # | Problem | Difficulty | Language |")
    lines.append("|---:|---------|------------|----------|")

    for p in problems:
        lang = _lang_display(p.language)
        # Escape pipe characters in titles
        title = p.title.replace("|", "\\|")
        lines.append(f"| {p.id} | {title} | {p.difficulty} | {lang} |")

    lines.append("")

    readme_path = repo_root / "README.md"
    # Write atomically by writing to temp then moving
    tmp = readme_path.with_suffix(".md.tmp")
    text = "\n".join(lines) + "\n"
    tmp.write_text(text, encoding="utf-8")
    tmp.replace(readme_path)

    return readme_path


if __name__ == "__main__":
    print(generate_readme())
