"""
Backend main entry point - Imports FastAPI app from ml module
"""
import sys
import os
from pathlib import Path

# Get the absolute path to the ml directory
backend_dir = Path(__file__).parent.resolve()
ml_dir = backend_dir.parent / "ml"

# Add the ml directory to the Python path
sys.path.insert(0, str(ml_dir))

try:
    # Import the FastAPI app from ml/app.py
    from app import app
except ImportError as e:
    print(f"Error importing app from {ml_dir}: {e}")
    print(f"Python path: {sys.path}")
    raise

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
