@echo off
REM SkinNet Analyzer React Frontend Start Script

echo.
echo ============================================
echo   SkinNet Analyzer - React Frontend
echo ============================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

echo Node.js version:
node --version

echo.

cd frontend

REM Check if node_modules exists
if not exist node_modules (
    echo Installing npm dependencies...
    npm install
)

echo.
echo ============================================
echo Starting React Frontend
echo ============================================
echo Frontend will be available at: http://localhost:3000
echo.
echo Press Ctrl+C to stop the development server
echo.

npm start

pause
