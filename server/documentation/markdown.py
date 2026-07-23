"""Small markdown rendering helpers used by documentation templates."""

from __future__ import annotations

from typing import Iterable, Sequence
from urllib.parse import quote


def heading(level: int, text: str) -> str:
    """Render a markdown heading."""

    if level < 1 or level > 6:
        raise ValueError("heading level must be between 1 and 6")
    return f"{'#' * level} {text}"


def horizontal_rule() -> str:
    """Render a markdown horizontal rule."""

    return "---"


def code_fence(code: str, language: str = "") -> str:
    """Render a fenced code block."""

    fence_language = language.strip()
    return f"```{fence_language}\n{code.rstrip()}\n```"


def unordered_list(items: Iterable[str]) -> str:
    """Render an unordered list."""

    return "\n".join(f"- {item}" for item in items)


def table(headers: Sequence[str], rows: Sequence[Sequence[object]], *, align_right: Iterable[int] = ()) -> str:
    """Render a deterministic markdown table."""

    right_aligned = set(align_right)
    header_cells = [_escape_cell(header) for header in headers]
    separator = [("---:" if index in right_aligned else "---") for index, _ in enumerate(headers)]
    lines = [
        "| " + " | ".join(header_cells) + " |",
        "| " + " | ".join(separator) + " |",
    ]
    for row in rows:
        cells = [_escape_cell(str(cell)) for cell in row]
        lines.append("| " + " | ".join(cells) + " |")
    return "\n".join(lines)


def markdown_link(text: str, target: str) -> str:
    """Render a markdown link with a URL-encoded relative target."""

    encoded = quote(target.replace("\\", "/"), safe="/#")
    return f"[{text}]({encoded})"


def _escape_cell(value: str) -> str:
    return value.replace("|", "\\|").replace("\n", " ")
