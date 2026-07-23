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

${sections_block}## Solution

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

${topic_distribution_section}${company_distribution_section}## Recently Solved

${recently_solved}

---

## Complete Problem Index

${problem_index}
"""
)

TOPIC_PAGE_TEMPLATE = Template(
    """# ${topic_name}

Solved: ${count}

---

## Problems

${problem_list}
"""
)
