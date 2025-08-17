@echo off
echo 🔄 Syncing KANBAN.md with GitHub Issues...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python not found. Please install Python first.
    pause
    exit /b 1
)

REM Install PyGithub if not present
echo 📦 Installing/updating PyGithub...
pip install PyGithub >nul 2>&1

REM Check for GitHub token
if "%GITHUB_TOKEN%"=="" (
    echo.
    echo ❌ GITHUB_TOKEN environment variable not set!
    echo.
    echo To set it:
    echo 1. Go to https://github.com/settings/tokens
    echo 2. Create a new personal access token with 'repo' permissions
    echo 3. Run: set GITHUB_TOKEN=your_token_here
    echo.
    pause
    exit /b 1
)

REM Run the sync script
echo 🚀 Running kanban sync...
python scripts\sync-kanban.py

echo.
echo ✅ Done! Check your GitHub repository for new issues.
pause
