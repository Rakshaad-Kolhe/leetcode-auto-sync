"""Release packaging script to generate extension.zip and Python release artifacts."""

from __future__ import annotations

import os
import shutil
import sys
import zipfile
from pathlib import Path


def package_extension(repo_root: Path) -> Path:
    """Package extension directory into dist/extension.zip."""
    ext_dir = repo_root / "extension"
    dist_dir = repo_root / "dist"
    dist_dir.mkdir(exist_ok=True)

    zip_path = dist_dir / "extension.zip"
    if zip_path.exists():
        zip_path.unlink()

    print(f"Packaging extension from {ext_dir} -> {zip_path}")
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, _, files in os.walk(ext_dir):
            for file in files:
                file_path = Path(root) / file
                rel_path = file_path.relative_to(ext_dir)
                zipf.write(file_path, arcname=rel_path)

    print(f"Extension packaged successfully ({zip_path.stat().st_size} bytes)")
    return zip_path


def main() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    package_extension(repo_root)


if __name__ == "__main__":
    main()
