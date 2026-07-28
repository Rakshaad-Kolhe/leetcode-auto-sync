#!/usr/bin/env bash
# LeetCode Auto Sync - Linux Installation Script

set -e

echo "================================================="
echo "       LeetCode Auto Sync Installer (Linux)      "
echo "================================================="

if ! command -v python3 &> /dev/null; then
    echo "[ERROR] python3 could not be found. Please install Python 3.10+."
    exit 1
fi

if ! command -v git &> /dev/null; then
    echo "[ERROR] git could not be found. Please install Git."
    exit 1
fi

echo "[1/3] Installing Python dependencies..."
python3 -m pip install -r server/requirements.txt

if [ ! -f "config/default_config.json" ]; then
    echo "[2/3] Generating default configuration..."
    mkdir -p config
    cat << 'EOF' > config/default_config.json
{
  "repository": {
    "repo_path": "~/leetcode-solutions",
    "folder_layout": "difficulty-number-title",
    "auto_generate_readme": true,
    "auto_generate_dashboard": true,
    "auto_generate_topics": true
  },
  "git": {
    "auto_commit": true,
    "auto_push": false,
    "commit_message": "Add {problem_number} - {title}"
  },
  "documentation": {
    "template": "classic"
  },
  "metadata": {
    "enable_graphql": true,
    "cache_days": 30
  }
}
EOF
fi

echo "[3/3] Installation completed successfully!"
echo "To start the backend server, run:"
echo "  python3 -m uvicorn server.app:app --reload --port 8000"
