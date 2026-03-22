@echo off
REM SkinNet Analyzer Quick Start Script

echo.
echo ============================================
echo   SkinNet Analyzer - Quick Start
echo ============================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://www.python.org
    pause
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js> is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

echo Python version:
python --version

echo Node.js version:
node --version

echo.
echo Setting up ML Backend...
echo.

cd ml

REM Check if venv exists
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate venv
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install/upgrade dependencies
echo Installing Python dependencies...
pip install --upgrade pip
pip install -r requirements.txt

echo.
echo ============================================
echo Starting ML Server (FastAPI)
echo ============================================
echo API will be available at: http://localhost:8000
echo API Docs at: http://localhost:8000/docs
echo.
echo Press Ctrl+C to stop the server
echo.

python app.py

pause
