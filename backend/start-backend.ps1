# SkinNet Analyzer Backend Start Script (PowerShell)

Write-Host ""
Write-Host "============================================"
Write-Host "   SkinNet Analyzer - Backend Server"
Write-Host "============================================"
Write-Host ""

# Check if venv exists
if (-not (Test-Path "venv")) {
    Write-Host "Creating virtual environment..."
    python -m venv venv
}

# Activate venv
Write-Host "Activating backend virtual environment..."
& .\venv\Scripts\Activate.ps1

# Check if opencv is installed
try {
    python -c "import cv2" 2>$null
} catch {
    Write-Host "Installing missing dependencies..."
    pip install opencv-python pillow --quiet
}

Write-Host ""
Write-Host "============================================"
Write-Host "Starting Backend Server (FastAPI)"
Write-Host "============================================"
Write-Host "API will be available at: http://localhost:8000"
Write-Host "API Docs at: http://localhost:8000/docs"
Write-Host ""
Write-Host "Press Ctrl+C to stop the server"
Write-Host ""

python -m uvicorn main:app --reload

Read-Host "Press Enter to exit"
