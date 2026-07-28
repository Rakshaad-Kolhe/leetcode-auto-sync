# Release Process Guide 🚀

Step-by-step instructions for maintainers publishing a new version release of **LeetCode Auto Sync**.

---

## 1. Version Bump & Verification

Run the release check verification script:
```bash
python scripts/release_check.py
```

## 2. Package Artifact Generation

Generate production build assets:
```bash
python scripts/package.py
python -m build
```

Verify that `dist/extension.zip` and `.whl` files are populated.

---

## 3. Git Tagging & Release Trigger

Tag the commit with semantic versioning and push to GitHub:
```bash
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

The `.github/workflows/release.yml` GitHub Action will automatically:
1. Build `extension.zip` and Python wheels.
2. Publish a official GitHub Release.
3. Attach `extension.zip` to release assets.
