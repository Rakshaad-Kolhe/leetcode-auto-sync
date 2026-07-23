# LeetCode Auto Sync - Windows Installation & Onboarding Script

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "       LeetCode Auto Sync Installer (Windows)    " -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

# 1. Verify Python
$PythonCmd = Get-Command python -ErrorAction SilentlyContinue
if (-not $PythonCmd) {
    Write-Host "[ERROR] Python was not found on PATH. Please install Python 3.10+ and re-run." -ForegroundColor Red
    Exit 1
}

$PythonVersion = python -c "import sys; print('.'.join(map(str, sys.version_info[:2])))"
Write-Host "[OK] Detected Python version $PythonVersion" -ForegroundColor Green

# 2. Verify Git
$GitCmd = Get-Command git -ErrorAction SilentlyContinue
if (-not $GitCmd) {
    Write-Host "[ERROR] Git was not found on PATH. Please install Git and re-run." -ForegroundColor Red
    Exit 1
}
Write-Host "[OK] Detected Git" -ForegroundColor Green

# 3. Install Dependencies
Write-Host "`n[1/3] Installing Python dependencies..." -ForegroundColor Yellow
python -m pip install -r server/requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed installing Python requirements." -ForegroundColor Red
    Exit 1
}

# 4. Generate Default Config if missing
$ConfigPath = "config/default_config.json"
if (-not (Test-Path $ConfigPath)) {
    Write-Host "`n[2/3] Creating default configuration file..." -ForegroundColor Yellow
    New-Item -Path "config" -ItemType Directory -Force | Out-Null
    @'
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
'@ | Set-Content -Path $ConfigPath -Encoding UTF8
    Write-Host "[OK] Created $ConfigPath" -ForegroundColor Green
}

Write-Host "`n[3/3] Installation completed successfully!" -ForegroundColor Green
Write-Host "`nTo start the backend server, run:" -ForegroundColor Cyan
Write-Host "  python -m uvicorn server.app:app --reload --port 8000" -ForegroundColor Yellow
