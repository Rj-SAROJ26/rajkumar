import io
import logging
import os
import secrets
import hashlib
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional
from urllib.parse import quote_plus

import cv2
import numpy as np
import pytz
import uvicorn
from PIL import Image
from fastapi import FastAPI, File, Request, UploadFile, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from classify import ensemble_classify, classes as MODEL_CLASSES


logging.basicConfig(level=logging.INFO)

user_logger = logging.getLogger("ml_user_requests")
cron_logger = logging.getLogger("ml_cron_heartbeats")
startup_logger = logging.getLogger("ml_startup_events")


def _load_local_env():
    for env_path in [Path(__file__).with_name(".env"), Path(__file__).parent.parent / ".env"]:
        if not env_path.exists():
            continue
        for line in env_path.read_text(encoding="utf-8").splitlines():
            stripped = line.strip()
            if not stripped or stripped.startswith("#") or "=" not in stripped:
                continue
            key, value = stripped.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value


_load_local_env()


class DiseaseInfoRequest(BaseModel):
    disease: str
    severity: str = "Moderate"
    location: str = ""


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatbotRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = None


class HospitalRequest(BaseModel):
    disease: str = ""
    location: str = ""
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class UserSignupRequest(BaseModel):
    username: str
    email: str
    password: str
    full_name: str


class UserLoginRequest(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    full_name: str


class AuthResponse(BaseModel):
    user: UserResponse
    token: str
    message: str


# Simple in-memory user storage (for demo purposes)
users_db = {}
security = HTTPBearer()


def hash_password(password: str) -> str:
    """Simple password hashing using SHA-256 with salt"""
    salt = secrets.token_hex(16)
    hashed = hashlib.sha256((password + salt).encode()).hexdigest()
    return f"{salt}:{hashed}"


def verify_password(password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    try:
        salt, hashed = hashed_password.split(":")
        return hashlib.sha256((password + salt).encode()).hexdigest() == hashed
    except:
        return False


def generate_token(user_id: str) -> str:
    """Generate a simple token (in production, use JWT)"""
    payload = f"{user_id}:{datetime.now().timestamp()}"
    return hashlib.sha256(payload.encode()).hexdigest()


def verify_token(token: str) -> Optional[dict]:
    """Verify token and return user info (simplified)"""
    # In a real app, you'd decode JWT and check expiration
    # For demo, we'll just check if token exists in any user's tokens
    for user in users_db.values():
        if user.get('current_token') == token:
            return {
                'id': user['id'],
                'username': user['username'],
                'email': user['email'],
                'full_name': user['full_name']
            }
    return None


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Dependency to get current authenticated user"""
    token = credentials.credentials
    user = verify_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user


DISEASE_TREATMENTS = {
    "Cellulitis": {
        "description": "Cellulitis is an acute, spreading, suppurative, non-suppurative inflammation of the loose subcutaneous tissues, particularly connective tissues of wounds and sores on the skin.",
        "symptoms_care": """## Symptoms
- Redness and warmth in the affected area
- Swelling and tenderness
- Pain and discomfort
- Fever and chills
- Red streaking from the affected area
- Possible pus or drainage

## Care Instructions
- Apply warm compresses to the affected area
- Keep the area clean and dry
- Elevate the affected limb to reduce swelling
- Avoid scratching or picking at the skin
- Wear loose, comfortable clothing

## Recommended Actions
- Consult a healthcare professional immediately
- Take prescribed antibiotics as directed
- Monitor for worsening symptoms
- Seek emergency care if symptoms spread rapidly
- Follow up with your doctor within 2-3 days""",
        "prescription": "Oral antibiotics such as cephalexin, dicloxacillin, or clindamycin as prescribed by physician; keep area clean and dry while treatment is ongoing.",
        "hospitals": [
            {"name": "Apollo Hospitals", "address": "Mumbai Central, India", "phone": "+91-22-30611111"},
            {"name": "Fortis Hospital", "address": "Mulund, Mumbai, India", "phone": "+91-22-67611111"},
            {"name": "Breach Candy Hospital", "address": "Fort, Mumbai, India", "phone": "+91-22-66606060"},
        ],
    },
    "Impetigo": {
        "description": "Impetigo is a superficial skin infection characterized by the formation of isolated pustules that coalesce to form crusted lesions. It primarily affects neonates and young children.",
        "symptoms_care": """## Symptoms
- Small blisters or pustules
- Honey-colored crusts on lesions
- Itching and mild pain
- Lesions typically appear on face and extremities
- May spread to other body parts
- Possible sore throat (if caused by streptococcus)

## Care Instructions
- Wash affected area gently with soap and water
- Apply antibiotic ointment as prescribed
- Keep the area clean and dry
- Avoid touching or scratching lesions
- Cover lesions with sterile bandages if needed
- Wear clean, soft clothing

## Recommended Actions
- Start topical or oral antibiotics immediately
- Maintain personal hygiene
- Avoid close contact with others (contagious)
- Trim nails short to prevent scratching
- Avoid swimming or bathing until healed
- Follow up with doctor in 7-10 days""",
        "prescription": "Topical mupirocin or fusidic acid; oral antibiotics like cephalexin or dicloxacillin if widespread; follow doctor guidance.",
        "hospitals": [
            {"name": "Apollo Hospitals", "address": "Mumbai Central, India", "phone": "+91-22-30611111"},
            {"name": "Lilavati Hospital", "address": "Bandra, Mumbai, India", "phone": "+91-22-56969696"},
            {"name": "Max Healthcare", "address": "Thane, Mumbai, India", "phone": "+91-22-61066666"},
        ],
    },
    "Athlete-foot": {
        "description": "Athlete's foot (Tinea Pedis) is a fungal infection of the feet common in athletes and people who spend time in warm, moist environments. It's contagious and can spread to other parts of the body.",
        "symptoms_care": """## Symptoms
- Itching, stinging, and burning between the toes
- Redness and inflammation
- Peeling and cracking of the skin
- Blistering or oozing of the affected area
- Foul odor from the feet
- Thickened toenails (in severe cases)

## Care Instructions
- Keep feet clean and dry, especially between toes
- Wear breathable, moisture-wicking socks
- Use antifungal powder or spray regularly
- Apply antifungal cream as prescribed
- Avoid walking barefoot in public areas
- Trim toenails straight across
- Avoid tight shoes; wear loose-fitting footwear

## Recommended Actions
- Apply antifungal cream twice daily for 4-6 weeks
- Use antifungal spray and powder in shoes
- Wash feet daily with antifungal soap
- Change socks if they become damp
- Avoid sharing towels, nail clippers, or footwear
- Consider oral antifungal medication if severe
- Follow up in 2-3 weeks""",
        "prescription": "Topical terbinafine, clotrimazole, or miconazole; for severe cases, oral terbinafine or itraconazole as prescribed.",
        "hospitals": [
            {"name": "Apollo Hospitals", "address": "Mumbai Central, India", "phone": "+91-22-30611111"},
            {"name": "HCG Cancer Center", "address": "Mumbai, India", "phone": "+91-22-67611111"},
            {"name": "Nanavati Super Specialty Hospital", "address": "Vile Parle, Mumbai, India", "phone": "+91-22-67444444"},
        ],
    },
    "Nail-fungus": {
        "description": "Nail fungus (Onychomycosis) is a fungal infection that causes nails to become thickened, discolored, brittle, and crumbly.",
        "symptoms_care": """## Symptoms
- Thickened nails
- Yellow or brown discoloration
- Nail brittleness or crumbling
- Distorted nail shape
- Detachment of nail from nail bed

## Care Instructions
- Keep nails clean and dry
- Trim nails straight and file down thickened areas
- Apply topical antifungal nail lacquer as directed
- Wear breathable footwear and moisture-wicking socks
- Avoid nail trauma and keep feet ventilated

## Recommended Actions
- Consult a dermatologist for systemic antifungal therapy if needed
- Continue treatment for several months until nail regrows
- Maintain proper foot hygiene
- Avoid sharing footwear or nail tools""",
        "hospitals": [
            {"name": "Apollo Hospitals", "address": "Mumbai Central, India", "phone": "+91-22-30611111"},
            {"name": "Breach Candy Hospital", "address": "Fort, Mumbai, India", "phone": "+91-22-66606060"},
            {"name": "Kokilaben Dhirubhai Ambani Hospital", "address": "Andheri West, Mumbai, India", "phone": "+91-22-30907000"},
        ],
    },
    "Ringworm": {
        "description": "Ringworm is a common fungal infection that causes a ring-shaped, red, and itchy rash on the skin.",
        "symptoms_care": """## Symptoms
- Circular patches with raised edges
- Red, itchy and scaly skin
- Clear or normal-looking center of rash
- Spread to multiple parts of body

## Care Instructions
- Keep area clean and dry
- Use over-the-counter antifungal cream as advised
- Avoid sharing towels, clothing, and bedding
- Wash hands frequently

## Recommended Actions
- Consult a doctor if rash persists more than 2 weeks
- Avoid touching or scratching the rash
- Continue treatment until rash fully resolves""",
        "prescription": "Topical clotrimazole or terbinafine; for severe or widespread infection, oral griseofulvin or terbinafine as recommended.",
        "hospitals": [
            {"name": "Fortis Hospital", "address": "Mulund, Mumbai, India", "phone": "+91-22-67611111"},
            {"name": "Lilavati Hospital", "address": "Bandra, Mumbai, India", "phone": "+91-22-56969696"},
        ],
    },
    "Cutaneous-larva-migrans": {
        "description": "Cutaneous larva migrans is a skin infection caused by animal hookworm larvae that penetrate the skin, leading to serpiginous itchy tracks.",
        "symptoms_care": """## Symptoms
- Red, winding, raised track on skin
- Intense itching
- Blistering or watery discharge
- Mostly appears on feet or lower legs

## Care Instructions
- Keep affected area clean and dry
- Avoid scratching to prevent secondary infection
- Apply topical antiparasitic medication if prescribed

## Recommended Actions
- See a healthcare provider for oral antiparasitic therapy
- Avoid walking barefoot in contaminated soil or sand
- Keep area covered and clean""",
        "prescription": "Oral albendazole or ivermectin as prescribed; use topical thiabendazole if recommended.",
        "hospitals": [
            {"name": "Tata Memorial Hospital", "address": "Parel, Mumbai, India", "phone": "+91-22-24177000"},
            {"name": "Jaslok Hospital", "address": "Pedder Road, Mumbai, India", "phone": "+91-22-66100000"},
        ],
    },
    "Chickenpox": {
        "description": "Chickenpox is a viral infection that causes an itchy, blister-like rash and is usually seen in children and unvaccinated adults.",
        "symptoms_care": """## Symptoms
- Itchy red spots and blisters
- Mild fever
- Fatigue and headache
- Loss of appetite

## Care Instructions
- Keep skin cool and dry
- Use calamine lotion for itch control
- Take antihistamine as advised by healthcare professional
- Avoid scratching blisters

## Recommended Actions
- See a doctor for antiviral medication if severe
- Encourage rest and fluids
- Keep away from uninfected individuals until fully recovered""",
        "prescription": "Antiviral treatment such as acyclovir for high-risk or severe cases; supportive care with antihistamines and pain relievers.",
        "hospitals": [
            {"name": "Kokilaben Dhirubhai Ambani Hospital", "address": "Andheri West, Mumbai, India", "phone": "+91-22-30907000"},
            {"name": "Global Hospital", "address": "Parel, Mumbai, India", "phone": "+91-22-66177777"},
        ],
    },
    "Shingles": {
        "description": "Shingles (Herpes Zoster) is caused by reactivation of the varicella zoster virus and leads to painful blistering rash in a dermatomal distribution.",
        "symptoms_care": """## Symptoms
- Painful, burning rash in one-sided band
- Blisters filled with fluid
- Tingling or numbness
- Fever or headache in some cases

## Care Instructions
- Keep rash clean and dry
- Apply cool compresses
- Use prescribed antiviral medication promptly
- Take pain relief medication as advised

## Recommended Actions
- See a doctor quickly in first 72 hours for antivirals
- Avoid contact with pregnant women and immunocompromised people
- Keep rash covered until healed""",
        "prescription": "Oral antivirals such as acyclovir, valacyclovir, or famciclovir; pain management with NSAIDs or prescribed neuropathic agents.",
        "hospitals": [
            {"name": "Hinduja Hospital", "address": "Mahim, Mumbai, India", "phone": "+91-22-24422717"},
            {"name": "Breach Candy Hospital", "address": "Fort, Mumbai, India", "phone": "+91-22-66606060"},
        ],
    },
}


CHATBOT_KNOWLEDGE = {
    "cellulitis": {
        "name": "Cellulitis",
        "summary": "a bacterial skin infection that often causes redness, warmth, swelling, and pain",
        "symptoms": ["redness", "warm skin", "swelling", "pain", "fever"],
        "care": [
            "keep the area clean and avoid scratching",
            "rest and elevate the area if swollen",
            "see a doctor soon because cellulitis often needs medical treatment",
        ],
        "urgent": True,
    },
    "impetigo": {
        "name": "Impetigo",
        "summary": "a contagious skin infection that can cause sores, blisters, and yellowish crusting",
        "symptoms": ["blisters", "sores", "crusting", "itching"],
        "care": [
            "wash the area gently with soap and water",
            "avoid touching or scratching the sores",
            "avoid sharing towels or clothes",
        ],
        "urgent": False,
    },
    "athlete-foot": {
        "name": "Athlete's Foot",
        "summary": "a common fungal infection that usually affects the feet, especially between the toes",
        "symptoms": ["itching", "burning", "cracks", "peeling skin"],
        "care": [
            "keep the feet clean and dry",
            "change socks regularly",
            "use an over-the-counter antifungal cream if suitable",
        ],
        "urgent": False,
    },
    "ringworm": {
        "name": "Ringworm",
        "summary": "a fungal skin infection that often appears as a circular, itchy, scaly rash",
        "symptoms": ["circular rash", "itching", "scaly skin", "red ring"],
        "care": [
            "keep the area clean and dry",
            "avoid sharing towels, combs, or clothes",
            "an over-the-counter antifungal cream may help in mild cases",
        ],
        "urgent": False,
    },
    "eczema": {
        "name": "Eczema",
        "summary": "a skin condition that can cause dryness, itching, redness, and irritation",
        "symptoms": ["dry skin", "itching", "redness", "rash"],
        "care": [
            "use a gentle moisturizer regularly",
            "avoid harsh soaps and scratching",
            "watch for signs of infection if the skin cracks or oozes",
        ],
        "urgent": False,
    },
    "psoriasis": {
        "name": "Psoriasis",
        "summary": "a chronic skin condition that may cause thick, scaly, inflamed patches",
        "symptoms": ["scaly patches", "red plaques", "itching", "dry skin"],
        "care": [
            "keep the skin moisturized",
            "avoid picking the scales",
            "see a dermatologist if patches are widespread or painful",
        ],
        "urgent": False,
    },
    "acne": {
        "name": "Acne",
        "summary": "a common skin condition that can cause pimples, blackheads, whiteheads, or tender bumps",
        "symptoms": ["pimples", "blackheads", "whiteheads", "tender bumps"],
        "care": [
            "wash gently and avoid scrubbing",
            "avoid picking or squeezing pimples",
            "over-the-counter products with benzoyl peroxide or salicylic acid may help some people",
        ],
        "urgent": False,
    },
    "scabies": {
        "name": "Scabies",
        "summary": "a contagious skin infestation that can cause intense itching and small rash-like bumps",
        "symptoms": ["intense itching", "small bumps", "rash", "worse at night"],
        "care": [
            "avoid close contact until checked by a doctor",
            "wash clothes and bedding after medical advice",
            "see a doctor because treatment is usually needed",
        ],
        "urgent": False,
    },
}


CHATBOT_ALIASES = {
    "athlete's foot": "athlete-foot",
    "athletes foot": "athlete-foot",
    "athlete foot": "athlete-foot",
    "tinea pedis": "athlete-foot",
}


DEFAULT_HOSPITALS = [
    {"name": "Apollo Hospitals", "address": "Mumbai Central, India", "phone": "+91-22-30611111"},
    {"name": "Fortis Hospital", "address": "Mulund, Mumbai, India", "phone": "+91-22-67611111"},
    {"name": "Lilavati Hospital", "address": "Bandra, Mumbai, India", "phone": "+91-22-56969696"},
]


local_timezone = pytz.timezone("Asia/Kolkata")
DEPLOYED_AT = datetime.now(local_timezone).strftime("%d-%m-%Y %I:%M %p")


@asynccontextmanager
async def lifespan(app: FastAPI):
    startup_logger.info(f"ML API backend redeployed at {DEPLOYED_AT}")
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_MULTI_IMAGES = 3
BLUR_VARIANCE_THRESHOLD = 90.0
MODEL_INPUT_SIZE = (224, 224)


def _mock_predictions() -> List[List[float]]:
    return [
        ["Cellulitis", 0.35],
        ["Impetigo", 0.28],
        ["Athlete-foot", 0.22],
    ]


def _ensure_rgb(image: Image.Image) -> Image.Image:
    if image.mode != "RGB":
        return image.convert("RGB")
    return image


def _compute_laplacian_variance(image: Image.Image) -> float:
    rgb_image = _ensure_rgb(image)
    rgb_array = np.array(rgb_image)
    gray_image = cv2.cvtColor(rgb_array, cv2.COLOR_RGB2GRAY)
    return float(cv2.Laplacian(gray_image, cv2.CV_64F).var())


def _enhance_image_for_model(image: Image.Image, target_size: tuple = MODEL_INPUT_SIZE) -> Image.Image:
    rgb_image = _ensure_rgb(image)
    rgb_array = np.array(rgb_image)

    # Resize for model input consistency.
    resized = cv2.resize(rgb_array, target_size, interpolation=cv2.INTER_AREA)

    # Contrast and brightness enhancement.
    contrast_enhanced = cv2.convertScaleAbs(resized, alpha=1.15, beta=10)

    # Optional lighting improvement with CLAHE in LAB space.
    lab = cv2.cvtColor(contrast_enhanced, cv2.COLOR_RGB2LAB)
    l_channel, a_channel, b_channel = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.2, tileGridSize=(8, 8))
    l_channel = clahe.apply(l_channel)
    enhanced = cv2.cvtColor(
        cv2.merge((l_channel, a_channel, b_channel)),
        cv2.COLOR_LAB2RGB,
    )

    # Normalize to [0,1] before restoring to uint8 for PIL compatibility.
    normalized = enhanced.astype(np.float32) / 255.0
    normalized_uint8 = np.clip(normalized * 255.0, 0, 255).astype(np.uint8)
    return Image.fromarray(normalized_uint8)


def _normalize_prediction_items(raw_predictions: List) -> List[List[float]]:
    normalized = []
    for item in raw_predictions:
        if not isinstance(item, (list, tuple)) or len(item) < 2:
            continue
        normalized.append([str(item[0]), float(item[1])])
    return normalized


def _average_prediction_sets(prediction_sets: List[List[List[float]]]) -> List[List[float]]:
    if not prediction_sets:
        return _mock_predictions()

    score_map: Dict[str, float] = {label: 0.0 for label in MODEL_CLASSES}
    for prediction_set in prediction_sets:
        for label, score in prediction_set:
            score_map[label] = score_map.get(label, 0.0) + float(score)

    total_sets = float(len(prediction_sets))
    averaged = [[label, score_map.get(label, 0.0) / total_sets] for label in score_map]
    averaged.sort(key=lambda item: item[1], reverse=True)
    return averaged[:3]


def _get_best_image_index(image_reports: List[Dict]) -> int:
    if not image_reports:
        return 0

    def _score(report: Dict) -> tuple:
        # Non-blurry images are prioritized, then blur score, then resolution.
        resolution = int(report.get("width", 0)) * int(report.get("height", 0))
        return (0 if report.get("is_blurry") else 1, float(report.get("blur_score", 0.0)), resolution)

    best_index = max(range(len(image_reports)), key=lambda idx: _score(image_reports[idx]))
    return int(best_index)



# Auth endpoints
@app.post("/api/auth/signup", response_model=AuthResponse)
async def signup(request: UserSignupRequest):
    """User signup endpoint"""
    try:
        # Check if user already exists
        if request.username in users_db or any(u['email'] == request.email for u in users_db.values()):
            raise HTTPException(status_code=400, detail="Username or email already exists")

        # Create user
        user_id = secrets.token_hex(8)
        hashed_password = hash_password(request.password)
        token = generate_token(user_id)

        user = {
            'id': user_id,
            'username': request.username,
            'email': request.email,
            'full_name': request.full_name,
            'password_hash': hashed_password,
            'current_token': token,
            'created_at': datetime.now()
        }

        users_db[request.username] = user

        user_logger.info(f"New user registered: {request.username}")

        return AuthResponse(
            user=UserResponse(
                id=user['id'],
                username=user['username'],
                email=user['email'],
                full_name=user['full_name']
            ),
            token=token,
            message="Account created successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        user_logger.exception(f"Error in signup: {e}")
        raise HTTPException(status_code=500, detail="Failed to create account")


@app.post("/api/auth/login", response_model=AuthResponse)
async def login(request: UserLoginRequest):
    """User login endpoint"""
    try:
        user = users_db.get(request.username)
        if not user or not verify_password(request.password, user['password_hash']):
            raise HTTPException(status_code=401, detail="Invalid username or password")

        # Generate new token
        token = generate_token(user['id'])
        user['current_token'] = token

        user_logger.info(f"User logged in: {request.username}")

        return AuthResponse(
            user=UserResponse(
                id=user['id'],
                username=user['username'],
                email=user['email'],
                full_name=user['full_name']
            ),
            token=token,
            message="Login successful"
        )

    except HTTPException:
        raise
    except Exception as e:
        user_logger.exception(f"Error in login: {e}")
        raise HTTPException(status_code=500, detail="Login failed")


@app.get("/api/auth/verify/{token}")
async def verify_token_endpoint(token: str):
    """Verify token endpoint"""
    try:
        user = verify_token(token)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        return UserResponse(
            id=user['id'],
            username=user['username'],
            email=user['email'],
            full_name=user['full_name']
        )

    except HTTPException:
        raise
    except Exception as e:
        user_logger.exception(f"Error in token verification: {e}")
        raise HTTPException(status_code=500, detail="Token verification failed")


def _format_bullets(items):
    return "\n".join(f"- {item}" for item in items)


def build_hospital_results(disease: str, location: str, hospitals: List[dict]) -> List[dict]:
    resolved_location = location.strip() or "India"
    disease_slug = disease.strip().lower().replace("-", " ")
    search_templates = [
        {
            "name": "Nearby General Hospital",
            "query": f"general hospital near {resolved_location}",
            "phone": "Search on Google Maps",
        },
        {
            "name": "Nearby Skin Specialist Hospital",
            "query": f"skin hospital near {resolved_location}",
            "phone": "Search on Google Maps",
        },
        {
            "name": f"Nearby Care For {disease.title()}",
            "query": f"{disease_slug} treatment hospital near {resolved_location}",
            "phone": "Search on Google Maps",
        },
    ]

    return [
        {
            "name": item["name"],
            "address": f"{item['name']}, {resolved_location}",
            "location": resolved_location,
            "phone": item["phone"],
            "maps_url": f"https://www.google.com/maps/search/{quote_plus(item['query'])}",
            "search_hint": item["query"],
        }
        for item in search_templates
    ]


def detect_chatbot_condition(message: str) -> Optional[dict]:
    normalized_message = message.lower().strip()

    for alias, key in CHATBOT_ALIASES.items():
        if alias in normalized_message:
            return CHATBOT_KNOWLEDGE.get(key)

    for key, info in CHATBOT_KNOWLEDGE.items():
        if key in normalized_message or info["name"].lower() in normalized_message:
            return info

    return None


def infer_possible_conditions(message: str) -> List[str]:
    normalized_message = message.lower()
    possible = []

    def add(name: str):
        if name not in possible:
            possible.append(name)

    if "itch" in normalized_message or "itching" in normalized_message:
        add("eczema")
        add("fungal infection")
        add("contact dermatitis")

    if "hand" in normalized_message or "palm" in normalized_message or "finger" in normalized_message:
        add("hand eczema")
        add("contact dermatitis")

    if "foot" in normalized_message or "toe" in normalized_message:
        add("athlete's foot")

    if "ring" in normalized_message or "circular" in normalized_message:
        add("ringworm")

    if "dry" in normalized_message or "scaly" in normalized_message or "peeling" in normalized_message:
        add("eczema")
        add("psoriasis")
        add("fungal infection")

    if "red" in normalized_message or "rash" in normalized_message:
        add("eczema")
        add("fungal infection")

    if "blister" in normalized_message or "crust" in normalized_message or "oozing" in normalized_message:
        add("impetigo")
        add("skin infection")

    if "pain" in normalized_message or "swelling" in normalized_message or "warm" in normalized_message:
        add("cellulitis")
        add("skin infection")

    if "pimple" in normalized_message or "acne" in normalized_message:
        add("acne")

    return possible[:4]


def has_urgent_signs(message: str) -> bool:
    urgent_terms = [
        "severe pain",
        "bleeding",
        "rapid spreading",
        "spreading quickly",
        "fever",
        "pus",
        "breathing trouble",
        "swollen face",
    ]
    normalized_message = message.lower()
    return any(term in normalized_message for term in urgent_terms)


def get_follow_up_question(message: str) -> str:
    normalized_message = message.lower()
    if "itch" not in normalized_message and "itching" not in normalized_message:
        return "Does it itch, hurt, or burn?"
    if "how long" not in normalized_message and "days" not in normalized_message and "weeks" not in normalized_message:
        return "How long have you had it, and is it spreading?"
    return "If you want, tell me the body area, how long it has been there, and whether there is itching, pain, or discharge."


def get_recent_user_context(history: Optional[List[ChatMessage]]) -> str:
    if not history:
        return ""

    recent_user_messages = [
        item.content.strip().lower()
        for item in history
        if item.role == "user" and item.content.strip()
    ]
    if not recent_user_messages:
        return ""

    return " ".join(recent_user_messages[-3:])


def generate_chatbot_response(message: str, history: Optional[List[ChatMessage]] = None) -> str:
    cleaned_message = message.strip()
    if not cleaned_message:
        return (
            "I can help with skin symptoms and general care.\n"
            "- Tell me what the rash or skin problem looks like\n"
            "- Mention itching, pain, scaling, blisters, or spreading\n"
            "- I am not a doctor, so please use this as general guidance only"
        )

    normalized_message = cleaned_message.lower()
    normalized_simple = "".join(char for char in normalized_message if char.isalnum() or char.isspace()).strip()
    recent_context = get_recent_user_context(history)
    condition = detect_chatbot_condition(cleaned_message)
    urgent = has_urgent_signs(cleaned_message)
    asks_prescription = any(term in normalized_message for term in ["prescription", "medicine", "tablet", "ointment"])

    greeting_terms = {"hi", "hii", "hello", "hey", "helo"}
    if normalized_simple in greeting_terms or any(
        normalized_simple.startswith(term + " ") for term in greeting_terms
    ):
        return (
            "Hey! What can I help you with today?\n"
            "- You can describe your skin symptoms\n"
            "- You can ask about a skin disease\n"
            "- You can also upload a skin photo for analysis\n"
            "- I give general guidance only, not a final diagnosis"
        )

    if any(
        phrase in normalized_simple
        for phrase in ["thank you", "thanks", "thx", "thankyou"]
    ):
        return (
            "You are welcome.\n"
            "If you want, you can tell me your symptoms, ask about a skin condition, or upload a skin photo."
        )

    if any(
        phrase in normalized_simple
        for phrase in ["bye", "goodbye", "see you", "ok bye"]
    ):
        return (
            "Take care.\n"
            "If you need help again, come back with your symptoms, your question, or a skin photo."
        )

    social_phrases = [
        "how are you",
        "how r you",
        "whats up",
        "what's up",
        "how do you do",
    ]
    if any(phrase in normalized_simple for phrase in social_phrases):
        return (
            "I am doing well and ready to help.\n"
            "Tell me your symptoms, ask about a skin condition, or upload a photo and I will guide you."
        )

    if any(
        phrase in normalized_simple
        for phrase in ["who are you", "what are you", "what can you do", "can you help me"]
    ):
        return (
            "I am your skin health assistant.\n"
            "- I can explain symptoms and possible conditions\n"
            "- I can give general skin-care guidance\n"
            "- I can review a skin photo from your upload\n"
            "- I cannot give a final diagnosis, but I can help you understand what to do next"
        )

    if any(
        phrase in normalized_simple
        for phrase in ["good morning", "good afternoon", "good evening"]
    ):
        return (
            "Hello. I am here and ready to help.\n"
            "You can ask me about skin symptoms, possible conditions, or upload a skin photo."
        )

    if any(
        phrase in normalized_simple
        for phrase in ["okay", "ok", "fine", "alright", "hmm"]
    ):
        return (
            "Sure.\n"
            "Whenever you are ready, tell me the skin problem, where it is, how long it has been there, or upload a photo."
        )

    if any(
        phrase in normalized_simple
        for phrase in ["i am worried", "im worried", "worried", "scared", "anxious", "concerned"]
    ):
        return (
            "I understand why you are concerned.\n"
            "Tell me what the skin problem looks like, where it is, and whether it is itchy, painful, or spreading.\n"
            "If it is severe, rapidly worsening, bleeding, or causing fever, please see a doctor soon."
        )

    if any(
        phrase in normalized_simple
        for phrase in ["i am confused", "im confused", "confused", "dont understand", "don't understand"]
    ):
        return (
            "No problem. We can keep it simple.\n"
            "Just tell me:\n"
            "- where the skin problem is\n"
            "- how long it has been there\n"
            "- whether it itches, hurts, burns, or is spreading"
        )

    if any(
        phrase in normalized_simple
        for phrase in ["what should i do", "what do i do", "help me", "please help"]
    ):
        return (
            "I can help with the next steps.\n"
            "Describe the skin problem or upload a photo, and I will explain possible causes, general care, and when to see a doctor."
        )

    if any(
        phrase in normalized_simple
        for phrase in ["are you real", "are you ai", "are you a bot", "are you human"]
    ):
        return (
            "I am an AI skin health assistant.\n"
            "I can help explain symptoms, possible skin conditions, photo findings, and general next steps."
        )

    if any(
        phrase in normalized_simple
        for phrase in ["good job", "nice", "great", "awesome", "well done"]
    ):
        return (
            "Thank you.\n"
            "I am glad to help. If you want, you can continue with another symptom question or upload a photo."
        )

    if any(
        phrase in normalized_simple
        for phrase in ["can you explain", "explain this", "tell me more", "more details"]
    ):
        return (
            "Yes, I can explain it in a simpler way.\n"
            "Tell me the skin condition name, your symptoms, or share a photo, and I will break it down clearly."
        )

    if any(
        phrase in normalized_simple
        for phrase in ["i dont know", "i don't know", "not sure", "unsure"]
    ):
        return (
            "That is okay.\n"
            "Start with anything you notice, like itching, redness, scaling, pain, blisters, or where it is on the body."
        )

    if any(
        phrase in normalized_simple
        for phrase in ["can i send photo", "can i upload photo", "should i upload photo", "can i show you"]
    ):
        return (
            "Yes, you can upload a skin photo or use the camera option.\n"
            "I will review it and explain the likely condition, common symptoms, and general next steps."
        )

    if any(
        phrase in normalized_simple
        for phrase in ["what diseases", "which diseases", "what can you detect"]
    ):
        return (
            "I can help with common skin concerns such as ringworm, eczema, acne, cellulitis, impetigo, psoriasis, athlete's foot, and similar symptoms.\n"
            "You can ask by symptom, disease name, or upload a photo."
        )

    if normalized_simple in {"yes", "yeah", "yep", "no", "nope"}:
        if "itch" in recent_context or "rash" in recent_context or "skin" in recent_context:
            return (
                f"Thanks, that helps.\n"
                f"You can now tell me:\n"
                f"- where it is on the body\n"
                f"- how long it has been there\n"
                f"- whether there is redness, scaling, pain, or spreading\n"
                f"- or upload a photo if that is easier"
            )
        return (
            "Thanks.\n"
            "Please add a little more detail about the skin problem so I can guide you better."
        )

    if len(normalized_simple.split()) <= 6 and recent_context:
        if any(term in normalized_simple for term in ["hand", "leg", "arm", "face", "foot", "back", "neck", "chest"]):
            return (
                f"Thanks, that body area helps.\n"
                f"Now tell me whether it is itchy, painful, scaly, red, or spreading.\n"
                f"If you want, you can also upload a skin photo."
            )
        if any(term in normalized_simple for term in ["itch", "itching", "pain", "burning", "red", "rash", "scaly", "dry"]):
            enriched_message = f"{recent_context} {normalized_message}".strip()
            possible_conditions = infer_possible_conditions(enriched_message)
            if possible_conditions:
                return (
                    "Thanks, that gives me more context.\n"
                    + "Possible causes could include:\n"
                    + "\n".join(f"- {item}" for item in possible_conditions[:4])
                    + "\n\nGeneral next steps:\n"
                    + "- keep the area clean and dry\n"
                    + "- avoid scratching or rubbing it\n"
                    + "- please see a dermatologist if it worsens or spreads"
                )

    lines = []

    if condition:
        lines.append(f"This may be related to {condition['name']}, which is {condition['summary']}.")
        lines.append("Common symptoms can include:")
        lines.extend(f"- {symptom}" for symptom in condition["symptoms"][:4])
        lines.append("General care steps:")
        lines.extend(f"- {tip}" for tip in condition["care"][:3])
    else:
        possible_conditions = infer_possible_conditions(cleaned_message)

        if possible_conditions:
            lines.append("Based on what you described, possible causes could include:")
            lines.extend(f"- {item}" for item in possible_conditions)
        else:
            lines.append("I cannot identify the exact condition from that alone, but I can still help narrow it down.")

        lines.append("Safe next steps:")
        lines.append("- keep the area clean and dry")
        lines.append("- avoid scratching, rubbing, or picking the skin")
        if "hand" in normalized_message:
            lines.append("- avoid harsh soaps, detergents, or sanitizers on that hand if they seem to trigger it")
        if "itch" in normalized_message or "itching" in normalized_message:
            lines.append("- a gentle moisturizer may help if the skin is dry or irritated")
        lines.append(f"- {get_follow_up_question(cleaned_message)}")

    if asks_prescription:
        lines.append("I cannot prescribe medicine, but I can explain common treatment options and safe over-the-counter care.")

    if urgent or (condition and condition.get("urgent")):
        lines.append("Please see a doctor soon, especially if there is fever, severe pain, bleeding, or fast spreading.")
    else:
        lines.append("If it worsens, spreads, becomes painful, or shows signs of infection, please consult a dermatologist.")

    lines.append("I am not a doctor, so this is general education and not a final diagnosis.")
    return "\n".join(lines)


@app.get("/")
async def health(request: Request):
    current_time = datetime.now(local_timezone).strftime("%d-%m-%Y %I:%M %p")
    heartbeat = request.headers.get("X-Heartbeat", "false").lower() == "true"

    if heartbeat:
        cron_logger.info(f"Cronjob heartbeat ping at {current_time}")
    else:
        user_logger.info(f"User accessed health check at {current_time}")

    return {"status": "ok", "deployed_at": DEPLOYED_AT, "checked_at": current_time}


@app.post("/")
async def predict(file: UploadFile = File(...)):
    """
    Process uploaded image and return top 3 disease predictions.
    Always returns predictions - uses mock if real predictions fail.
    """
    mock_predictions = [
        ["Cellulitis", 0.35],
        ["Impetigo", 0.28],
        ["Athlete-foot", 0.22],
    ]

    try:
        user_logger.info(f"Prediction request received. File type: {file.content_type}")

        if file.content_type not in ["image/jpeg", "image/png"]:
            user_logger.error(f"Invalid file type: {file.content_type}")
            return JSONResponse(content={"predictions": mock_predictions})

        try:
            image_bytes = await file.read()
            if not image_bytes:
                user_logger.error("Empty file received")
                return JSONResponse(content={"predictions": mock_predictions})

            img = Image.open(io.BytesIO(image_bytes))
            if img.mode != "RGB":
                img = img.convert("RGB")

            user_logger.info(f"Image loaded successfully. Size: {img.size}")
        except Exception as e:
            user_logger.error(f"Error loading image: {e}")
            return JSONResponse(content={"predictions": mock_predictions})

        try:
            top_3_predictions = ensemble_classify(img)
            user_logger.info(f"Real predictions obtained: {top_3_predictions}")
            return JSONResponse(content={"predictions": top_3_predictions})
        except Exception as e:
            user_logger.warning(f"Classification failed, using mock predictions: {str(e)}")
            return JSONResponse(content={"predictions": mock_predictions})

    except Exception as e:
        user_logger.exception(f"Unexpected error in predict: {e}")
        return JSONResponse(content={"predictions": mock_predictions})


@app.post("/api/predict_images")
async def predict_images(files: List[UploadFile] = File(...)):
    """
    Analyze 1-3 images with quality checks and preprocessing.
    - Computes blur score using variance of Laplacian.
    - Enhances brightness/contrast and lighting before inference.
    - Averages predictions across uploaded images.
    """
    mock_predictions = _mock_predictions()

    try:
        if not files:
            return JSONResponse(
                content={
                    "predictions": mock_predictions,
                    "images": [],
                    "warning": "No images uploaded.",
                    "has_blurry_images": False,
                    "all_images_blurry": False,
                    "best_image_index": 0,
                }
            )

        if len(files) > MAX_MULTI_IMAGES:
            files = files[:MAX_MULTI_IMAGES]

        prediction_sets: List[List[List[float]]] = []
        image_reports: List[Dict] = []

        for file in files:
            if file.content_type not in ["image/jpeg", "image/png"]:
                user_logger.warning(f"Skipping unsupported file type: {file.content_type}")
                continue

            image_bytes = await file.read()
            if not image_bytes:
                user_logger.warning(f"Skipping empty file: {file.filename}")
                continue

            try:
                original_image = _ensure_rgb(Image.open(io.BytesIO(image_bytes)))
            except Exception as image_error:
                user_logger.warning(f"Failed to decode image {file.filename}: {image_error}")
                continue

            blur_score = _compute_laplacian_variance(original_image)
            is_blurry = blur_score < BLUR_VARIANCE_THRESHOLD

            enhanced_image = _enhance_image_for_model(original_image)
            width, height = original_image.size

            try:
                predictions = _normalize_prediction_items(ensemble_classify(enhanced_image))
            except Exception as prediction_error:
                user_logger.warning(
                    f"Prediction failed for {file.filename}, using mock predictions: {prediction_error}"
                )
                predictions = mock_predictions

            prediction_sets.append(predictions)
            image_reports.append(
                {
                    "file_name": file.filename,
                    "width": width,
                    "height": height,
                    "blur_score": round(float(blur_score), 2),
                    "is_blurry": bool(is_blurry),
                }
            )

        if not prediction_sets:
            return JSONResponse(
                content={
                    "predictions": mock_predictions,
                    "images": [],
                    "warning": "No valid images found. Please upload JPG or PNG images.",
                    "has_blurry_images": False,
                    "all_images_blurry": False,
                    "best_image_index": 0,
                }
            )

        averaged_predictions = _average_prediction_sets(prediction_sets)
        best_image_index = _get_best_image_index(image_reports)

        has_blurry_images = any(report["is_blurry"] for report in image_reports)
        all_images_blurry = all(report["is_blurry"] for report in image_reports)

        warning_message = None
        if all_images_blurry:
            warning_message = (
                "Image is not clear. Please upload a sharper image for better results."
            )
        elif has_blurry_images:
            warning_message = (
                "Some images look blurry. Results were optimized using the clearer images."
            )

        return JSONResponse(
            content={
                "predictions": averaged_predictions,
                "images": image_reports,
                "best_image_index": best_image_index,
                "best_image_predictions": prediction_sets[best_image_index],
                "has_blurry_images": has_blurry_images,
                "all_images_blurry": all_images_blurry,
                "warning": warning_message,
            }
        )

    except Exception as e:
        user_logger.exception(f"Unexpected error in predict_images: {e}")
        return JSONResponse(
            content={
                "predictions": mock_predictions,
                "images": [],
                "warning": "Failed to process uploaded images.",
                "has_blurry_images": False,
                "all_images_blurry": False,
                "best_image_index": 0,
            }
        )


@app.post("/api/get_disease_info")
async def get_disease_info(request: DiseaseInfoRequest):
    """
    Return detailed disease information, treatment suggestions, and nearby hospitals.
    """
    try:
        disease = (request.disease or "").strip()
        severity = (request.severity or "Moderate").strip()
        location = (request.location or "").strip()

        user_logger.info(f"Disease info request: {disease}, Severity: {severity}, Location: {location}")

        # Normalize disease name for fuzzy matching
        disease_key = None
        normalized_request = disease.lower().strip().replace(" ", "-")

        # Exact match (case-insensitive) and normalization with hyphens
        for key in DISEASE_TREATMENTS:
            key_normalized = key.lower().strip().replace(" ", "-")
            if key_normalized == normalized_request or key.lower().strip() == disease.lower().strip():
                disease_key = key
                break

        # Try chatbot aliases if still not found
        if not disease_key:
            alias_key = CHATBOT_ALIASES.get(disease.lower().strip())
            if alias_key and alias_key in DISEASE_TREATMENTS:
                disease_key = alias_key

        # Fall back to known chatbot knowledge mapping using name fields
        if not disease_key:
            normalized_request_no_dash = normalized_request.replace("-", " ")
            for key, info in CHATBOT_KNOWLEDGE.items():
                if key == normalized_request or key == normalized_request_no_dash or info["name"].lower() == disease.lower().strip():
                    mapped_key = key
                    if mapped_key in DISEASE_TREATMENTS:
                        disease_key = mapped_key
                        break

        # Default to the exact disease string if it's already in DISEASE_TREATMENTS
        if not disease_key and disease in DISEASE_TREATMENTS:
            disease_key = disease

        if disease_key:
            disease_data = DISEASE_TREATMENTS[disease_key]
            symptoms_care = disease_data.get("symptoms_care", "")
            description = disease_data.get("description", "")
            prescription = disease_data.get("prescription", "")
            hospitals = build_hospital_results(disease_key, location, disease_data.get("hospitals", []))
            user_logger.info(f"Disease info found for: {disease_key} (requested {disease})")
        else:
            user_logger.warning(f"Disease not found in database: {disease}, using defaults")
            description = f"{disease or 'Unknown condition'} may require further clinical evaluation."
            prescription = ""
            symptoms_care = f"""## {disease or 'Unknown condition'}
This condition requires professional medical attention.

## Recommended Actions
- Consult a healthcare professional immediately
- Seek dermatological evaluation
- Do not attempt self-diagnosis or treatment
- Follow prescribed treatment guidelines
- Monitor symptoms closely"""
            hospitals = build_hospital_results(disease or "Unknown", location, DEFAULT_HOSPITALS)

        response_data = {
            "disease": disease or "Unknown",
            "severity": severity or "Moderate",
            "location": location,
            "description": description,
            "symptoms_care": symptoms_care,
            "prescription": prescription,
            "hospitals": hospitals,
            "out_of_class": False,
        }

        user_logger.info(f"Returning disease info for: {disease or 'Unknown'}")
        return JSONResponse(content=response_data)

    except Exception as e:
        error_msg = str(e)
        user_logger.exception(f"Error in get_disease_info: {error_msg}")
        return JSONResponse(
            content={
                "error": "Failed to retrieve disease information",
                "exception": error_msg,
                "symptoms_care": "Unable to fetch treatment information at this time.",
                "hospitals": [],
            },
            status_code=200,
        )


@app.post("/api/confirm_symptoms")
async def confirm_symptoms(request: dict):
    """
    Handle symptom confirmation - placeholder for future enhancement.
    """
    try:
        user_logger.info("Symptom confirmation received")
        return JSONResponse(
            content={
                "disease": "Confirmed",
                "severity": "Moderate",
                "success": True,
            }
        )
    except Exception as e:
        user_logger.exception(f"Error in confirm_symptoms: {e}")
        return JSONResponse(content={"error": "Failed to process symptoms"}, status_code=200)


@app.post("/api/chatbot")
async def chatbot(request: ChatbotRequest):
    try:
        user_logger.info("Chatbot request received")
        response_text = generate_chatbot_response(request.message, request.history)
        return JSONResponse(
            content={
                "reply": response_text,
                "disclaimer": "This is general educational guidance only and not a final diagnosis.",
            }
        )
    except Exception as e:
        user_logger.exception(f"Error in chatbot endpoint: {e}")
        return JSONResponse(
            content={
                "reply": (
                    "I could not process that right now.\n"
                    "- Please try again with your symptoms, body area, and how long it has been there\n"
                    "- If symptoms are severe or spreading quickly, please see a doctor"
                )
            },
            status_code=200,
        )


@app.post("/api/hospitals")
async def get_hospitals(request: HospitalRequest):
    """
    Return nearby hospitals and clinics based on disease and location.
    """
    try:
        disease = (request.disease or "").strip()
        location = (request.location or "").strip()

        user_logger.info(f"Hospital search request: {disease}, Location: {location}")

        # Mock hospital data - in production, integrate with Google Places API
        mock_hospitals = [
            {
                "id": 1,
                "name": "City Dermatology Center",
                "address": f"123 Medical Plaza, {location or 'Downtown'}",
                "distance": "2.3 km",
                "rating": 4.5,
                "type": "Specialist",
                "phone": "+1-555-0123",
                "hours": "Mon-Fri 9AM-6PM",
                "specialty": get_disease_specialty(disease),
                "coordinates": {"lat": 40.7128, "lng": -74.0060}
            },
            {
                "id": 2,
                "name": "General Hospital",
                "address": f"456 Health Street, {location or 'Downtown'}",
                "distance": "3.1 km",
                "rating": 4.2,
                "type": "Hospital",
                "phone": "+1-555-0456",
                "hours": "24/7",
                "specialty": "General Medicine",
                "coordinates": {"lat": 40.7589, "lng": -73.9851}
            },
            {
                "id": 3,
                "name": "Skin Care Clinic",
                "address": f"789 Wellness Ave, {location or 'Downtown'}",
                "distance": "1.8 km",
                "rating": 4.7,
                "type": "Clinic",
                "phone": "+1-555-0789",
                "hours": "Tue-Sat 10AM-7PM",
                "specialty": get_disease_specialty(disease),
                "coordinates": {"lat": 40.7505, "lng": -73.9934}
            },
            {
                "id": 4,
                "name": "Medical Center",
                "address": f"321 Care Boulevard, {location or 'Downtown'}",
                "distance": "4.5 km",
                "rating": 4.0,
                "type": "Hospital",
                "phone": "+1-555-0321",
                "hours": "Mon-Sun 8AM-8PM",
                "specialty": "Multi-specialty",
                "coordinates": {"lat": 40.7282, "lng": -73.7949}
            }
        ]

        return JSONResponse(content={"hospitals": mock_hospitals})

    except Exception as e:
        user_logger.exception(f"Error in hospitals endpoint: {e}")
        return JSONResponse(
            content={"error": "Failed to retrieve hospital information", "hospitals": []},
            status_code=200,
        )


def get_disease_specialty(disease: str) -> str:
    """Map disease to medical specialty"""
    disease_specialties = {
        "acne": "Dermatology",
        "eczema": "Dermatology",
        "psoriasis": "Dermatology",
        "ringworm": "Dermatology",
        "cellulitis": "Infectious Diseases",
        "impetigo": "Dermatology",
        "athlete-foot": "Podiatry",
        "nail-fungus": "Dermatology"
    }

    return disease_specialties.get(disease.lower(), "Dermatology")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=7860)
