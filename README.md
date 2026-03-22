# SkinNet - Skin Disease Analyzer

A comprehensive web-based application for skin disease detection and analysis using advanced machine learning models. The system provides accurate skin disease classification, severity assessment, and medical guidance through an intuitive web interface.

## 🌟 Features

- **Advanced ML Models**: Multiple CNN architectures (EfficientNet, ResNet, MobileNet) for accurate disease detection
- **Severity Assessment**: Regression model to determine disease severity levels
- **Medical Chatbot**: AI-powered chatbot providing medical guidance and information
- **User Authentication**: Secure login system protecting user data and analysis history
- **Responsive Design**: Modern, professional UI with mobile-friendly interface
- **Real-time Analysis**: Instant disease detection and severity scoring
- **Medical Database**: Comprehensive information on treatments and care instructions

## 🏗️ Architecture

### Frontend (React)
- Modern React application with routing
- Professional authentication system
- Responsive design with CSS modules
- Real-time image upload and preview
- Interactive chatbot interface

### Backend (FastAPI)
- High-performance FastAPI server
- RESTful API endpoints for ML predictions
- User authentication and session management
- CORS-enabled for frontend communication
- Asynchronous request handling

### Machine Learning (PyTorch)
- Multiple pre-trained CNN models
- Image preprocessing and augmentation
- Disease classification (8 skin conditions)
- Severity prediction (regression model)
- Model training and evaluation pipeline

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 14+
- PyTorch (optional for training)

### Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd SkinNet-Analyzer-main
   ```

2. **Backend Setup**
   ```bash
   cd ml
   pip install -r requirements.txt
   uvicorn app:app --reload
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm start
   ```

4. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000

## 📋 Supported Skin Conditions

1. Cellulitis
2. Impetigo
3. Athlete's Foot
4. Ringworm
5. Eczema
6. Psoriasis
7. Acne
8. Scabies

## 🔐 Authentication System

The application features a complete authentication system:
- User registration and login
- Secure token-based authentication
- Protected routes for all features
- User session management

## 📊 API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/verify` - Token verification

### ML Predictions
- `POST /api/predict` - Disease classification
- `POST /api/severity` - Severity assessment
- `POST /api/chatbot` - Medical chatbot queries

### Medical Information
- `GET /api/diseases/{disease}` - Disease information and treatments

## 🛠️ Development

### Project Structure
```
SkinNet-Analyzer-main/
├── frontend/              # React application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── context/       # React context providers
│   │   └── i18n/          # Internationalization
│   └── public/
├── ml/                    # Machine learning backend
│   ├── models/            # Trained models
│   ├── app.py             # FastAPI application
│   ├── classify.py        # ML prediction logic
│   └── train.py           # Model training script
├── backend/               # Additional backend files
└── skin-*                 # Standalone components
```

### Training Models

To train the ML models:

```bash
cd ml
python train.py
```

This will train and save:
- `models/efficientnet.pth`
- `models/resnet.pth`
- `models/mobilenet.pth`
- `models/severity_model.pth`

## 5.4 Modifications and Improvements

### 1. Introduction

During the development of the SkinNet – Skin Disease Analyzer, several modifications were made to improve system performance, accuracy, usability, and scalability. Continuous improvements were implemented based on testing results and system limitations.

### 2. Modifications Implemented

#### 2.1 Model Optimization

Improved the CNN model by adjusting:

- Number of layers
- Activation functions
- Epochs and batch size

Reduced overfitting using:

- Dropout layers
- Data augmentation

**Impact**: Increased prediction accuracy and model reliability.

#### 2.2 Image Preprocessing Enhancement

- Standardized image size (e.g., 224×224 pixels)
- Applied normalization (pixel scaling)
- Improved image quality handling

**Impact**: Better input consistency and improved model performance.

#### 2.3 Backend Improvements

- Switched to FastAPI for faster performance
- Implemented asynchronous API handling
- Optimized API response time

**Impact**: Faster communication between frontend and backend.

#### 2.4 Frontend Enhancements

- Improved UI design for better user experience
- Added proper error messages (invalid input, upload failure)
- Simplified image upload process
- **Added User Authentication System**: Complete login/registration with professional UI

**Impact**: Enhanced usability and user interaction.

#### 2.5 Code Refactoring

Divided code into modules:

- Backend (main.py)
- ML (classify.py, train.py)
- Frontend (React)

Improved naming conventions and comments

**Impact**: Better readability and maintainability.

#### 2.6 Error Handling Improvements

Added validation for:

- Invalid image formats
- Empty inputs
- Implemented exception handling in backend

**Impact**: Increased system robustness.

### 3. Future Improvements

#### 3.1 Advanced Model Implementation

Use advanced architectures like:

- Transfer Learning (ResNet, EfficientNet)
- Improve classification accuracy further

#### 3.2 Mobile Application Development

- Develop Android/iOS app
- Use TensorFlow Lite for on-device prediction

#### 3.3 Real-Time Detection

- Integrate camera-based detection
- Enable live skin analysis

#### 3.4 Cloud Deployment

- Deploy system on cloud platforms (AWS, Azure, etc.)
- Enable remote access and scalability

#### 3.5 Database Integration

- Store user history and predictions
- Maintain medical records

#### 3.6 Multi-Disease Expansion

Extend system to detect:

- More skin diseases
- Severity levels

#### 3.7 Chatbot Integration

Add AI chatbot for:

- Basic medical guidance
- User queries

### 4. Conclusion

The modifications made in the SkinNet system significantly improved its performance, usability, and reliability. Future enhancements will focus on scalability, accuracy, and real-world deployment to make the system more effective and user-friendly.

## 📄 License

This project is for educational and research purposes. Please consult medical professionals for actual medical advice.

## ⚠️ Disclaimer

This application is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of qualified health providers with questions about medical conditions.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Contact

For questions or support, please open an issue in the repository.