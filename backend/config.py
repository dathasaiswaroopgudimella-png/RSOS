"""
RoadSOS — Omniscient Configuration Engine
Loads environment variables safely, initializes clinical constants,
and sets up fail-safe baseline plans.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Base paths
BASE_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = BASE_DIR / "backend"
DATA_DIR = BACKEND_DIR / "data"

# Load .env from root and backend
load_dotenv(BASE_DIR / ".env")
load_dotenv(BACKEND_DIR / ".env")

# Database paths
CSV_PATH = DATA_DIR / "hospital_directory.csv"
DB_PATH = DATA_DIR / "hospitals.db"

# API Keys
DATA_GOV_IN_API_KEY = os.getenv("DATA_GOV_IN_API_KEY", "579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
OPENCAGE_API_KEY = os.getenv("OPENCAGE_API_KEY", "")
GEOAPIFY_API_KEY = os.getenv("GEOAPIFY_API_KEY", "")
WEATHER_API_KEY = os.getenv("WEATHER_API_KEY", "")
IPINFO_API_KEY = os.getenv("IPINFO_API_KEY", "")

# Server & Network Configuration
PORT = int(os.getenv("PORT", "8000"))
CORS_ORIGIN = os.getenv("CORS_ORIGIN", "*")

# Spatial & Routing Thresholds
DEFAULT_LAT = 17.3850  # Hyderabad default fallback
DEFAULT_LON = 78.4867
MAX_RADIUS_KM = 35.0   # Search radius for hospitals
CRITICAL_DISTANCE = 3.0 # Within 3km distance triggers critical emergency level
MAX_RESULTS = 10       # Top hospitals returned
FTS_RESULTS = 20       # Full text search max results

# Sentinel Engine Thresholds (Kinetic Crash Detection)
IMPACT_ACCEL_THRESHOLD_G = 4.5       # Magnitude > 4.5g (44.1 m/s^2)
SUDDEN_STOP_SPEED_DELTA_KMH = 30.0   # Deceleration > 30 km/h in < 1 second
ROLLOVER_TILT_ANGLE_DEG = 65.0       # Vehicle roll/pitch > 65 degrees

# AI Racing Timeout (Sub-second fallback guarantee)
AI_RACE_TIMEOUT_SEC = 3.5

# Fail-Safe Baseline Plan (Zero-failure guarantee even in total offline outage)
FAILSAFE_PLAN = {
    "primary_action": "Call National Ambulance (108) immediately and keep the patient still.",
    "secondary_action": "Ensure airway is clear, control severe bleeding with firm pressure, and do not move injured limbs.",
    "reason": "Emergency triage automated failsafe activated. Specialized trauma assistance required.",
    "severity": "critical",
    "recommended_hospital": "Nearest District Government Hospital / Level 1 Trauma Facility",
    "estimated_response_time": "5-10 minutes (Ambulance 108 Dispatch)",
    "first_aid_tips": [
        "Dial 108 (Ambulance) or 112 (National Emergency Dispatch).",
        "Keep patient calm, lie them flat unless breathing is compromised.",
        "Apply clean pressure bandages to any active hemorrhaging.",
        "Do not remove helmet if spinal injury is suspected unless airway is blocked."
    ],
    "tier_used": "deterministic_failsafe"
}

# Clinical Severity Levels
SEVERITY_LEVELS = ["low", "medium", "high", "critical"]
