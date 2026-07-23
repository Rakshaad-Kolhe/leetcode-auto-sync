"""Templates package for repository documentation generation."""

from __future__ import annotations

from typing import Dict, Type

from .base import BaseTemplate
from .classic import ClassicTemplate
from .detailed import DetailedTemplate
from .minimal import MinimalTemplate

TEMPLATES: Dict[str, Type[BaseTemplate]] = {
    "classic": ClassicTemplate,
    "minimal": MinimalTemplate,
    "detailed": DetailedTemplate,
}


def get_template(template_name: str) -> BaseTemplate:
    """Return an instance of `BaseTemplate` matching `template_name`.

    Falls back to `ClassicTemplate` if `template_name` is unrecognized.
    """
    key = (template_name or "").strip().lower()
    cls = TEMPLATES.get(key, ClassicTemplate)
    return cls()


__all__ = [
    "BaseTemplate",
    "ClassicTemplate",
    "MinimalTemplate",
    "DetailedTemplate",
    "get_template",
]
