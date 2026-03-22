@echo off
REM SkinNet Analyzer Backend Start Script

echo.
echo ============================================
echo   SkinNet Analyzer - Backend Server
echo ============================================
echo.

REM Check if venv exists
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate venv
echo Activating backend virtual environment...
call venv\Scripts\activate.bat

REM Check if opencv is installed
python -c "import cv2" 2>nul
if errorlevel 1 (
    echo Installing missing dependencies...
    pip install opencv-python pillow --quiet
)

echo.
echo ============================================
echo Starting Backend Server (FastAPI)
echo ============================================
echo API will be available at: http://localhost:8000
echo API Docs at: http://localhost:8000/docs
echo.
echo Press Ctrl+C to stop the server
echo.

python -m uvicorn main:app --reload

pause
