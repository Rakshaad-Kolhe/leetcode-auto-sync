"""Reusable markdown templates for generated repository documentation."""

from __future__ import annotations

from string import Template

PROBLEM_README_TEMPLATE = Template(
    """# ${problem_number}. ${title}

${difficulty_badge}

${language_badge}

---

## Problem

${url}

---

## Language

${language}

---

## Solution

${solution_block}

---

Generated automatically by LeetCode Auto Sync.

Last Updated:
${generated_at}
"""
)

ROOT_README_TEMPLATE = Template(
    """# LeetCode Solutions

---

## Repository Statistics

${statistics_table}

Last Updated: ${generated_at}

Newest Problem: ${newest_problem}

Oldest Problem: ${oldest_problem}

---

## Difficulty Distribution

${difficulty_distribution}

---

## Language Distribution

${language_distribution}

---

## Recently Solved

${recently_solved}

---

## Complete Problem Index

${problem_index}
"""
)
