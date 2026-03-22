# SkinNet Analyzer - Project Setup & Run Guide

## Encoding Fix ✓
VS Code has been configured to properly handle all files in this project:
- All files will use UTF-8 encoding
- Binary files (.pth models) are excluded from the editor view
- Virtual environments and cache folders are hidden

## Prerequisites
- Python 3.8+ (for backend/ML)
- Node.js 14+ (for frontend)
- Git (optional but recommended)

## Project Structure
```
├── backend/          - Backend services (if any)
├── frontend/         - React frontend application
├── ml/              - Machine Learning FastAPI server
│   ├── app.py       - Main FastAPI application
│   ├── classify.py  - Classification logic
│   ├── train.py     - Model training script
│   ├── requirements.txt
│   └── models/      - Pre-trained PyTorch models
├── skin-**/         - Standalone components/demos
└── SkinNet-Analyzer-Test-Images/  - Sample test images
```

## Setup & Run Instructions

### 1. ML/Backend Server Setup
```powershell
# Navigate to ML directory
cd ml

# Create virtual environment (if not already created)
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Run the FastAPI server
python app.py
# Server will run on http://localhost:8000
```

### 2. Frontend Setup
```powershell
# Navigate to frontend directory (in a new terminal)
cd frontend

# Install dependencies
npm install

# Start development server
npm start
# Frontend will run on http://localhost:3000
```

### 3. Access the Application
- Frontend: http://localhost:3000
- API: http://localhost:8000
- API Docs: http://localhost:8000/docs (Swagger UI)

## Troubleshooting

### If you get encoding errors:
- The setting has been automatically configured
- Restart VS Code to apply the changes
- Files will now display correctly with UTF-8 encoding

### If Python dependencies fail:
```powershell
# Ensure pip is updated
python -m pip install --upgrade pip

# Try installing with specific versions
pip install --upgrade -r requirements.txt
```

### If Node modules fail:
```powershell
# Clear cache and reinstall
rm -r node_modules
npm cache clean --force
npm install
```

### GPU/CUDA Issues (Optional):
If you have NVIDIA GPU and want to use CUDA:
```powershell
# Install CUDA-compatible PyTorch
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

## Development Tips

### Python Backend
- Edit files in `ml/` directory
- Changes to `app.py` or `classify.py` may require server restart
- Check logs for errors and debugging

### React Frontend
- Hot reload is enabled by default with `npm start`
- Edit files in `frontend/src/` directory
- Changes save automatically

### Machine Learning
- To train models: `python ml/train.py`
- Models are saved in `ml/models/` directory
- Pre-trained models: efficientnet.pth, mobilenet.pth, resnet.pth, severity_model.pth

## Building for Production

### Frontend Build
```powershell
cd frontend
npm run build
# Output will be in frontend/build directory
```

### API Deployment
The ML server is ready to be deployed with:
- Docker (Dockerfile is provided)
- Cloud platforms (AWS, Azure, Google Cloud)
- Traditional servers

## Additional Resources

### API Health Check
```
GET http://localhost:8000/
Response: {"status": "ok", "deployed_at": "...", "checked_at": "..."}
```

### Image Upload for Prediction
```
POST http://localhost:8000/
Multipart form with "file" parameter (JPEG or PNG image)
```

---
**Last Updated**: March 2026
**Project**: SkinNet Analyzer
