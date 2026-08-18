"""Repository Scanner Service for deterministic analysis of synchronized solution files."""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any, Dict, List, Optional


class RepositoryScanner:
    """Scans local LeetCode solutions repository files and extracts authoritative data."""

    def __init__(self, repo_path: Optional[Path] = None) -> None:
        self.repo_path = repo_path.expanduser().resolve() if repo_path else None

    def parse_problem_folder(self, folder_path: Path) -> Optional[Dict[str, Any]]:
        """Parse a single problem directory (e.g. 'Easy/3014-Minimum Number of Pushes to Type Word I')."""
        folder_name = folder_path.name
        match = re.match(r"^(\d+)\s*[-.]\s*(.+)$", folder_name)
        if match:
            problem_id = int(match.group(1))
            title = match.group(2).strip()
        else:
            # Fallback for folder names without numeric prefix (e.g. 'two-sum')
            problem_id = 0
            title = folder_name.strip()

        if not title:
            return None

        # Compute clean titleSlug (e.g. 'Two Sum' -> 'two-sum')
        clean_slug = re.sub(r"[^\w\s-]", "", title.lower()).strip()
        clean_slug = re.sub(r"[\s_]+", "-", clean_slug)
        clean_slug = re.sub(r"^-+|-+$", "", clean_slug)

        # Determine difficulty from parent directory name
        difficulty = folder_path.parent.name
        if difficulty not in ["Easy", "Medium", "Hard"]:
            difficulty = "Medium"

        readme_path = folder_path / "README.md"
        has_readme = readme_path.exists()
        broken_links = []

        code_files = []
        for file_path in folder_path.iterdir():
            if file_path.is_file() and file_path.name != "README.md":
                suffix = file_path.suffix.lower()
                lang = "cpp" if suffix == ".cpp" else "python" if suffix == ".py" else "java" if suffix == ".java" else "js"
                code_files.append({
                    "fileName": file_path.name,
                    "filePath": str(file_path),
                    "language": lang,
                    "size": file_path.stat().st_size
                })

        topics = []
        if has_readme:
            try:
                content = readme_path.read_text(encoding="utf8", errors="ignore")
                topics_match = re.search(r"##\s*Topics?\s*\n+((?:[ \t]*[-*]\s*.+\n?)+)", content, re.IGNORECASE)
                if topics_match:
                    topic_lines = topics_match.group(1).strip().splitlines()
                    for line in topic_lines:
                        t = re.sub(r"^[ \t]*[-*]\s*", "", line).strip()
                        if t:
                            topics.append(t)

                # Check markdown links
                link_matches = re.findall(r"\[([^\]]+)\]\(([^)]+)\)", content)
                for link_text, link_url in link_matches:
                    url_lower = link_url.lower()
                    if "shields.io" in url_lower or "githubusercontent.com" in url_lower or "raw.githubusercontent.com" in url_lower:
                        continue
                    if link_url.startswith("http://") or link_url.startswith("https://"):
                        # Ignore valid external HTTP/HTTPS URLs
                        continue
                    else:
                        # Check if relative file link exists on disk
                        target_file = (folder_path / link_url).resolve()
                        if not target_file.exists():
                            broken_links.append(link_url)
            except Exception:
                pass

        return {
            "id": problem_id,
            "title": title,
            "slug": clean_slug,
            "titleSlug": clean_slug,
            "difficulty": difficulty,
            "folderPath": str(folder_path),
            "hasReadme": has_readme,
            "topics": topics,
            "topicTags": topics,
            "codeFiles": code_files,
            "brokenLinks": broken_links
        }

    def _extract_git_metadata(self) -> Dict[str, Any]:
        """Extract Git repository metadata (remote URL, owner, repoName, branch, commit hash)."""
        meta: Dict[str, Any] = {
            "isGit": False,
            "repoUrl": None,
            "repoName": self.repo_path.name if self.repo_path else "Leetcode-solutions",
            "owner": None,
            "branch": "main",
            "lastCommitHash": None,
            "lastSynced": None,
            "lastSyncedText": None,
        }
        if not self.repo_path or not (self.repo_path / ".git").exists():
            return meta

        meta["isGit"] = True
        git_dir = self.repo_path / ".git"

        # 1. Parse .git/config for remote "origin" URL
        config_path = git_dir / "config"
        if config_path.exists():
            try:
                config_text = config_path.read_text(encoding="utf-8", errors="ignore")
                origin_match = re.search(r'\[remote\s+"origin"\][^\[]*?url\s*=\s*([^\r\n]+)', config_text, re.DOTALL | re.IGNORECASE)
                if not origin_match:
                    origin_match = re.search(r'url\s*=\s*([^\r\n]+)', config_text, re.IGNORECASE)
                if origin_match:
                    raw_url = origin_match.group(1).strip()
                    gh_match = re.search(r"github\.com[:/]([^/]+)/([^/.]+)(?:\.git)?", raw_url, re.IGNORECASE)
                    if gh_match:
                        owner = gh_match.group(1).strip()
                        repo_name = gh_match.group(2).strip()
                        meta["owner"] = owner
                        meta["repoName"] = repo_name
                        meta["repoUrl"] = f"https://github.com/{owner}/{repo_name}"
                    else:
                        meta["repoUrl"] = raw_url
            except Exception:
                pass

        # 2. Parse .git/HEAD for current branch
        head_path = git_dir / "HEAD"
        if head_path.exists():
            try:
                head_text = head_path.read_text(encoding="utf-8", errors="ignore").strip()
                if head_text.startswith("ref:"):
                    ref_path_rel = head_text[4:].strip()
                    meta["branch"] = ref_path_rel.split("/")[-1]
                    ref_file = git_dir / ref_path_rel
                    if ref_file.exists():
                        meta["lastCommitHash"] = ref_file.read_text(encoding="utf-8", errors="ignore").strip()[:7]
                else:
                    meta["lastCommitHash"] = head_text[:7]
            except Exception:
                pass

        # 3. Try reading commit hash from packed-refs if ref file didn't exist
        if not meta["lastCommitHash"]:
            packed_refs = git_dir / "packed-refs"
            if packed_refs.exists():
                try:
                    packed_text = packed_refs.read_text(encoding="utf-8", errors="ignore")
                    for line in packed_text.splitlines():
                        if meta["branch"] in line and not line.startswith(("#", "^")):
                            parts = line.split()
                            if parts:
                                meta["lastCommitHash"] = parts[0][:7]
                                break
                except Exception:
                    pass

        return meta

    def scan_repository(self) -> Dict[str, Any]:
        """Scan complete solution repository structure and return deterministic audit payload."""
        if not self.repo_path or not self.repo_path.exists():
            return {
                "configured": False,
                "syncedCount": 0,
                "totalAccepted": 0,
                "missingCount": 0,
                "hasReadme": False,
                "syncedProblems": [],
                "brokenLinksCount": 0,
                "duplicateCount": 0,
                "metadataCompleteness": 0.0,
                "repoUrl": None,
                "repoName": "Leetcode-solutions",
                "owner": None,
                "branch": "main",
                "lastCommitHash": None,
                "lastSynced": None,
                "lastSyncedText": None
            }

        git_meta = self._extract_git_metadata()
        synced_problems: List[Dict[str, Any]] = []
        problem_ids: Dict[int, List[str]] = {}
        broken_links_total: List[Dict[str, Any]] = []

        for diff_folder in ["Easy", "Medium", "Hard"]:
            target_dir = self.repo_path / diff_folder
            if not target_dir.exists():
                # Fallback to checking root or subfolders
                target_dir = self.repo_path

            for item in target_dir.iterdir():
                if item.is_dir() and not item.name.startswith("."):
                    problem_data = self.parse_problem_folder(item)
                    if problem_data:
                        synced_problems.append(problem_data)
                        pid = problem_data["id"]
                        if pid not in problem_ids:
                            problem_ids[pid] = []
                        problem_ids[pid].append(problem_data["folderPath"])

                        if problem_data["brokenLinks"]:
                            broken_links_total.append({
                                "problemId": pid,
                                "filePath": str(item / "README.md"),
                                "links": problem_data["brokenLinks"]
                            })

        duplicates = [{"id": pid, "paths": paths} for pid, paths in problem_ids.items() if len(paths) > 1]
        synced_count = len(synced_problems)
        has_root_readme = (self.repo_path / "README.md").exists()

        return {
            "configured": True,
            "repoPath": str(self.repo_path),
            "syncedCount": synced_count,
            "totalAccepted": synced_count,
            "missingCount": 0,
            "hasReadme": has_root_readme,
            "syncedProblems": synced_problems,
            "brokenLinksCount": len(broken_links_total),
            "duplicateCount": len(duplicates),
            "duplicates": duplicates,
            "brokenLinks": broken_links_total,
            "metadataCompleteness": 1.0 if synced_count > 0 else 0.0,
            "isGit": git_meta["isGit"],
            "repoUrl": git_meta["repoUrl"],
            "repoName": git_meta["repoName"],
            "owner": git_meta["owner"],
            "branch": git_meta["branch"],
            "lastCommitHash": git_meta["lastCommitHash"],
            "lastSynced": git_meta["lastSynced"],
            "lastSyncedText": git_meta["lastSyncedText"]
        }


def scan_repository(repo_path: Optional[Path] = None) -> Dict[str, Any]:
    """Standalone module function for repository scanning."""
    scanner = RepositoryScanner(repo_path=repo_path)
    return scanner.scan_repository()
