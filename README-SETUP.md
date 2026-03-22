# SkinNet Analyzer - Complete Setup Guide

## ✅ What's Been Fixed

Your encoding issues have been resolved! Here's what was configured:

### VS Code Configuration
- **File Encoding**: All files now use UTF-8 encoding
- **Auto-Detection**: Enabled for any files with different encodings
- **Binary Files**: Hidden from editor (`.pth` models won't try to load as text)
- **Cache/Virtual Envs**: Automatically excluded from view

### Project Files Created
1. `.vscode/settings.json` - VS Code workspace settings
2. `.vscode/extensions.json` - Recommended extensions
3. `.editorconfig` - Editor configuration for consistency
4. `SETUP.md` - Detailed setup instructions
5. `start-ml.bat` - Quick start script for ML server
6. `start-frontend.bat` - Quick start script for React frontend
7. This file - Complete guide

---

## 🚀 Quick Start (Choose One Method)

### Method 1: Using Quick Start Scripts (Easiest)

**For ML/Backend Server:**
```powershell
# Double-click this file in File Explorer:
start-ml.bat

# OR run in PowerShell:
.\start-ml.bat
```

**For React Frontend (in a NEW terminal/command prompt):**
```powershell
# Double-click this file in File Explorer:
start-frontend.bat

# OR run in PowerShell:
.\start-frontend.bat
```

### Method 2: Manual Setup

#### Step 1: ML Server Setup
```powershell
# Open PowerShell and navigate to project
cd "c:\Users\RAJ\Downloads\New PROJECT\SkinNet-Analyzer-main"

# Go to ML directory
cd ml

# Create virtual environment (first time only)
python -m venv venv

# Activate it
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Run the server
python app.py
```

**Expected Output:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

#### Step 2: Frontend Setup (NEW Terminal/PowerShell)
```powershell
# Open a new PowerShell window
cd "c:\Users\RAJ\Downloads\New PROJECT\SkinNet-Analyzer-main\frontend"

# Install dependencies (first time only)
npm install

# Start development server
npm start
```

**Expected Output:**
```
Compiled successfully!
You can now view final in the browser.
  Local:            http://localhost:3000
```

---

## 🌐 Access Points

Once both servers are running:

| Component | URL | Purpose |
|-----------|-----|---------|
| Frontend | http://localhost:3000 | Web application |
| API Server | http://localhost:8000 | Backend API |
| API Documentation | http://localhost:8000/docs | Interactive API docs |
| API ReDoc | http://localhost:8000/redoc | Alternative API docs |

---

## 📁 Project Structure

```
SkinNet-Analyzer-main/
├── .vscode/                          # VS Code configuration
│   ├── settings.json                 # Encoding and editor settings
│   └── extensions.json               # Recommended extensions
├── frontend/                         # React application
│   ├── src/
│   │   ├── components/              # React components
│   │   ├── context/                 # Context API files
│   │   ├── assets/                  # Images and static files
│   │   └── App.js                   # Main app component
│   ├── package.json                 # npm dependencies
│   └── public/                      # Static HTML
├── ml/                              # ML/Backend API
│   ├── app.py                       # FastAPI main server
│   ├── classify.py                  # Classification logic
│   ├── train.py                     # Model training
│   ├── models/                      # Pre-trained models
│   │   ├── efficientnet.pth
│   │   ├── mobilenet.pth
│   │   ├── resnet.pth
│   │   └── severity_model.pth
│   └── requirements.txt             # Python dependencies
├── backend/                         # Backend services (if any)
├── skin-*/                          # Standalone components
├── SkinNet-Analyzer-Test-Images/   # Sample images for testing
├── .editorconfig                    # Editor configuration
├── start-ml.bat                     # Quick start ML script
├── start-frontend.bat               # Quick start frontend script
└── SETUP.md                         # Detailed setup guide
```

---

## 🔧 Using the Application

### 1. If you see the React app at localhost:3000:
- ✅ Frontend is working
- Use the UI to upload skin images for analysis

### 2. If you see API docs at localhost:8000/docs:
- ✅ Backend is working
- You can test the `/` endpoint (health check)
- Upload images with the POST endpoint

### 3. Testing the API with curl:
```powershell
# Health check
curl http://localhost:8000/

# Upload an image (test.jpg must exist)
$form = @{
    file = Get-Item 'path\to\image.jpg'
}
Invoke-WebRequest -Uri http://localhost:8000/ -Method Post -Form $form
```

---

## ⚠️ Common Issues & Solutions

### Issue: "Python not found" or "pip not found"
**Solution:**
- Install Python from https://www.python.org
- During installation, **check "Add Python to PATH"**
- Restart your terminal/VS Code after installation

### Issue: "npm not found"
**Solution:**
- Install Node.js from https://nodejs.org
- Restart your terminal/VS Code after installation

### Issue: Permission denied when running scripts
**Solution:**
```powershell
# Run this once in PowerShell as Administrator:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Issue: Port 3000 or 8000 already in use
**Solution:**
```powershell
# Find what's using the port (8000):
netstat -ano | findstr :8000

# Kill the process (replace PID with the number):
taskkill /PID <PID> /F
```

### Issue: Module not found errors
**Solution:**
```powershell
# Make sure virtual environment is activated, then:
pip install --upgrade pip
pip install -r requirements.txt
```

### Issue: Files still showing encoding errors
**Solution:**
- Close VS Code completely
- Delete `.vscode` folder
- Open project again
- VS Code will re-create `.vscode` with settings

---

## 📚 API Endpoints

### Health Check
```
GET http://localhost:8000/
```
Returns server status and deployment info

### Image Prediction
```
POST http://localhost:8000/
Body: multipart/form-data with "file" parameter
```
Accepts JPEG or PNG images for skin analysis

---

## 🎓 Development Workflow

### Making Changes to Frontend
1. Edit files in `frontend/src/`
2. Changes auto-refresh at localhost:3000
3. Check browser console for errors

### Making Changes to ML/Backend
1. Edit files in `ml/` directory
2. Server may need restart (Ctrl+C, then `python app.py`)
3. Check terminal for error logs

### Running Tests
```powershell
# Frontend tests
cd frontend
npm test

# ML tests (if available)
cd ml
python -m pytest
```

---

## 🐳 Docker & Deployment

The project includes a Dockerfile for the ML server:

```powershell
# Build Docker image
docker build -t skinnet-analyzer-ml ./ml

# Run Docker container
docker run -p 8000:8000 skinnet-analyzer-ml
```

---

## 📞 Need Help?

1. Check `SETUP.md` for detailed instructions
2. Check `.vscode/settings.json` to verify encoding settings
3. Look at the console output for error messages
4. Make sure both servers are running on different terminals

---

## ✨ You're All Set!

Your project is now ready to run. All encoding issues have been fixed, and you have quick-start scripts to get going.

**Next Steps:**
1. Run `start-ml.bat` (or use manual setup)
2. Run `start-frontend.bat` in a new terminal
3. Open http://localhost:3000 in your browser
4. Start analyzing skin conditions! 🎉

---

**Last Updated**: March 2026  
**Encoding**: UTF-8  
**Python Version Required**: 3.8+  
**Node.js Version Required**: 14+
