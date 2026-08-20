"""
RoadSOS — Omniscient Emergency Decision Intelligence API (v5.0)
Production-grade FastAPI Gateway with BallTree spatial intelligence,
dual-engine AI triage, and real-time kinetic telemetry.
"""

import sys
import time
import urllib.parse
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from loguru import logger

from backend import database
from backend.ai_triage import race_triage_decision
from backend.config import (
    DATA_GOV_IN_API_KEY, OPENROUTER_API_KEY, DEEPSEEK_API_KEY,
    OPENCAGE_API_KEY, GEOAPIFY_API_KEY, WEATHER_API_KEY, IPINFO_API_KEY,
    FAILSAFE_PLAN, CORS_ORIGIN
)
from backend.geocode import geocode
from backend.models import (
    EmergencyRequest, EmergencyResponse, SearchRequest, SearchResponse,
    GeocodeRequest, GeocodeResponse, HealthResponse, HospitalModel,
    DispatchBroadcastRequest, DispatchBroadcastResponse, WeatherInfo
)
from backend.weather import get_weather

# ──────────────────────────────────────────────
# Logging Configuration
# ──────────────────────────────────────────────
logger.remove()
logger.add(
    sys.stderr,
    format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{line}</cyan> — <level>{message}</level>"
)
logger.add("roadsos.log", rotation="20 MB", retention="10 days", compression="zip")


# ──────────────────────────────────────────────
# Application Lifespan
# ──────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initializes BallTree spatial index and SQLite database on startup."""
    logger.info("[STARTUP] Initializing RoadSOS Emergency Decision Intelligence Platform...")
    try:
        database.initialize()
        stats = database.get_db_stats()
        logger.success(f"[STARTUP] Spatial Index Ready: {stats.get('total_hospitals', 0)} hospitals loaded across {stats.get('states', 0)} states.")
    except Exception as e:
        logger.error(f"[STARTUP] Error during initialization: {e}")
    yield
    logger.info("[SHUTDOWN] RoadSOS Engine gracefully terminated.")


# ──────────────────────────────────────────────
# FastAPI Application Instance
# ──────────────────────────────────────────────
app = FastAPI(
    title="RoadSOS — Emergency Guidance & Crash Intelligence API",
    description="Mission-critical emergency guidance with 30,000+ national hospitals, autonomous kinetic detection, and racing AI triage.",
    version="5.0.0",
    lifespan=lifespan
)

# CORS Middleware (Supports local dev & Vercel production domains)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if CORS_ORIGIN == "*" else [CORS_ORIGIN, "http://localhost:5173", "http://localhost:3000", "https://*.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ──────────────────────────────────────────────
# Request Tracing Middleware
# ──────────────────────────────────────────────
@app.middleware("http")
async def request_tracing_middleware(request: Request, call_next):
    req_id = str(uuid.uuid4())[:8]
    start_time = time.time()
    with logger.contextualize(request_id=req_id):
        response = await call_next(request)
        elapsed_ms = (time.time() - start_time) * 1000
        response.headers["X-Request-ID"] = req_id
        response.headers["X-Response-Time-Ms"] = f"{elapsed_ms:.1f}"
        return response


# ──────────────────────────────────────────────
# Global Exception Handler (Never leave user hanging)
# ──────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"[GLOBAL_EXCEPTION] Unhandled error: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "status": "error",
            "plan": FAILSAFE_PLAN,
            "hospitals": [],
            "weather": None,
            "metadata": {"error": str(exc), "fallback": True}
        }
    )


# ──────────────────────────────────────────────
# GET /api/health
# ──────────────────────────────────────────────
@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    """System health check, database stats, and API integration status."""
    db_stats = database.get_db_stats()
    return HealthResponse(
        status="healthy",
        db_stats=db_stats,
        api_keys={
            "data_gov_in": bool(DATA_GOV_IN_API_KEY),
            "openrouter": bool(OPENROUTER_API_KEY),
            "deepseek": bool(DEEPSEEK_API_KEY),
            "opencage": bool(OPENCAGE_API_KEY),
            "geoapify": bool(GEOAPIFY_API_KEY),
            "weather": bool(WEATHER_API_KEY),
            "ipinfo": bool(IPINFO_API_KEY)
        },
        version="5.0.0"
    )


# ──────────────────────────────────────────────
# POST /api/emergency/guidance — CORE TRIAGE ENDPOINT
# ──────────────────────────────────────────────
@app.post("/api/emergency/guidance", response_model=EmergencyResponse)
async def emergency_guidance(req: EmergencyRequest):
    """
    Primary Emergency Gateway:
      1. Spatial BallTree query + Clinical Suitability Calculus (rank top trauma facilities)
      2. Asynchronous Weather & Transit assessment
      3. Dual Racing AI Triage Engine (Sub-10ms deterministic vs OpenRouter LLM)
    """
    logger.info(f"🚨 [EMERGENCY_SOS] Coords: ({req.lat}, {req.lon}) | Signals: {req.signals}")
    start_time = time.time()

    # 1. Query nearest hospitals ranked by clinical suitability
    hospitals = database.find_nearest_hospitals(
        lat=req.lat,
        lon=req.lon,
        signals=req.signals,
        limit=8
    )

    # 2. Fetch weather context concurrently
    weather_info = await get_weather(req.lat, req.lon)
    weather_ctx = f"{weather_info.condition}, {weather_info.temperature_c}°C, Road: {weather_info.road_condition}"

    # 3. Race AI triage decision
    plan = await race_triage_decision(
        signals=req.signals,
        hospitals=hospitals,
        vehicle_available=req.vehicle_available,
        telemetry=req.telemetry,
        weather_context=weather_ctx
    )

    elapsed_ms = (time.time() - start_time) * 1000
    logger.success(f"[EMERGENCY_SOS] Triage complete in {elapsed_ms:.1f}ms -> Best: {plan.recommended_hospital}")

    return EmergencyResponse(
        status="ok",
        plan=plan,
        hospitals=hospitals,
        weather=weather_info,
        metadata={
            "latency_ms": round(elapsed_ms, 1),
            "hospitals_evaluated": len(hospitals),
            "tier_used": plan.tier_used
        }
    )


# ──────────────────────────────────────────────
# POST /api/search
# ──────────────────────────────────────────────
@app.post("/api/search", response_model=SearchResponse)
async def search_hospitals(req: SearchRequest):
    """Full-text and spatial search across 30,000+ national hospitals."""
    results = database.search_hospitals_fts(
        query=req.query,
        lat=req.lat,
        lon=req.lon,
        limit=req.limit
    )
    return SearchResponse(
        status="ok",
        count=len(results),
        results=results
    )


# ──────────────────────────────────────────────
# POST /api/geocode
# ──────────────────────────────────────────────
@app.post("/api/geocode", response_model=GeocodeResponse)
async def geocode_address(req: GeocodeRequest):
    """Multi-provider geocoding for addresses, landmarks, and pincodes."""
    return await geocode(req.address)


# ──────────────────────────────────────────────
# GET /api/weather
# ──────────────────────────────────────────────
@app.get("/api/weather", response_model=WeatherInfo)
async def fetch_weather(lat: float, lon: float):
    """Fetches real-time weather and road condition analysis."""
    return await get_weather(lat, lon)


# ──────────────────────────────────────────────
# POST /api/dispatch/broadcast
# ──────────────────────────────────────────────
@app.post("/api/dispatch/broadcast", response_model=DispatchBroadcastResponse)
async def broadcast_emergency_dispatch(req: DispatchBroadcastRequest):
    """
    Generates structured digital dispatch payloads for SMS, WhatsApp, and emergency services.
    """
    dispatch_id = f"SOS-{int(time.time())}-{str(uuid.uuid4())[:4].upper()}"
    timestamp_str = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())

    signals_text = ", ".join(req.signals) if req.signals else "Autonomous Crash / Impact"
    maps_link = f"https://www.google.com/maps/search/?api=1&query={req.lat},{req.lon}"

    telemetry_details = ""
    if req.g_force:
        telemetry_details += f" | Impact: {req.g_force:.1f}G"
    if req.speed:
        telemetry_details += f" | Speed: {req.speed:.0f} km/h"

    sms_text = (
        f"🚨 [ROADSOS EMERGENCY DISPATCH #{dispatch_id}]\n"
        f"PATIENT: {req.patient_name} (Blood: {req.blood_group})\n"
        f"SEVERITY: {req.crash_severity.upper()}{telemetry_details}\n"
        f"CONDITIONS: {signals_text}\n"
        f"DESTINATION: {req.hospital_name} (Call: {req.hospital_phone})\n"
        f"LIVE GPS LOCATION: {maps_link}"
    )

    encoded_msg = urllib.parse.quote(sms_text)
    whatsapp_url = f"https://api.whatsapp.com/send?text={encoded_msg}"

    logger.info(f"📢 [DISPATCH_BROADCAST] Generated broadcast #{dispatch_id}")

    return DispatchBroadcastResponse(
        status="ok",
        dispatch_id=dispatch_id,
        timestamp=timestamp_str,
        sms_payload=sms_text,
        whatsapp_url=whatsapp_url,
        alert_summary=f"Emergency broadcast #{dispatch_id} ready for instant transmission."
    )


# ──────────────────────────────────────────────
# WebSocket /ws/telemetry — LIVE SENSOR STREAM
# ──────────────────────────────────────────────
@app.websocket("/ws/telemetry")
async def websocket_telemetry_endpoint(websocket: WebSocket):
    """Real-time bi-directional kinetic telemetry and anomaly alert stream."""
    await websocket.accept()
    logger.info("[WS] Telemetry client connected.")
    try:
        while True:
            data = await websocket.receive_json()
            g_force = data.get("g_force", 1.0)
            if g_force > 4.5:
                # Anomaly detected in telemetry stream
                await websocket.send_json({
                    "type": "ANOMALY_TRIGGERED",
                    "severity": "critical",
                    "g_force": g_force,
                    "timestamp": time.time(),
                    "message": "High-G collision anomaly detected. Initiating emergency sentinel countdown."
                })
            else:
                await websocket.send_json({"type": "PONG", "status": "nominal"})
    except WebSocketDisconnect:
        logger.info("[WS] Telemetry client disconnected.")
    except Exception as e:
        logger.warning(f"[WS] Telemetry stream error: {e}")
