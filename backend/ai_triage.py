"""
RoadSOS — Advanced Clinical AI & Trauma Resuscitation Triage Engine
Combines:
  1. Instantaneous Deterministic Clinical Protocol Engine (<5ms)
  2. OpenRouter Neural AI Engine for dynamic deep reasoning
"""

import asyncio
import json
import re
import time
from typing import List, Optional

import httpx
from loguru import logger

from backend.config import OPENROUTER_API_KEY, DEEPSEEK_API_KEY, AI_RACE_TIMEOUT_SEC, FAILSAFE_PLAN
from backend.models import ActionPlan, HospitalModel, KineticTelemetry

# Deterministic Clinical Protocols (Standardized Trauma & Emergency Medicine)
DETERMINISTIC_RULES = {
    "automatic_crash_detection": {
        "primary_action": "High-impact collision detected. Keep patient still and maintain neutral spine alignment.",
        "secondary_action": "Do not remove helmet unless airway is obstructed; monitor breathing and pulse continuously.",
        "reason": "Autonomous kinetic telemetry recorded severe collision impact forces. Immediate Level-1 trauma evaluation required for internal deceleration injuries.",
        "severity": "critical",
        "first_aid_tips": [
            "Keep victim calm and completely stationary to protect spinal cord.",
            "Do NOT attempt to pull victims from vehicle unless imminent fire or traffic hazard.",
            "Apply direct, steady pressure with clean cloth to any external bleeding.",
            "Cover the patient with clothing or blanket to prevent hypothermic trauma shock."
        ]
    },
    "severe_crash": {
        "primary_action": "Severe vehicular collision. Keep patient calm, still, and upright if conscious.",
        "secondary_action": "Check Airway, Breathing, and Circulation (ABC protocol) without moving neck.",
        "reason": "High-velocity impact with significant risk of blunt chest trauma and cervical injury.",
        "severity": "critical",
        "first_aid_tips": [
            "Maintain manual head and neck stabilization in neutral position.",
            "Firmly press sterile gauze on visible lacerations without removing soaked pads.",
            "Do NOT provide water or food in case immediate emergency surgery is needed.",
            "Keep bystanders back to ensure adequate airflow and clear ambulance access."
        ]
    },
    "cardiac_arrest": {
        "primary_action": "Begin Hands-Only CPR immediately (100 to 120 compressions per minute in chest center).",
        "secondary_action": "Dispatch emergency ambulance with defibrillator (AED) and cardiac monitoring.",
        "reason": "Sudden loss of cardiac output. Survival drops 10% for every minute without uninterrupted CPR.",
        "severity": "critical",
        "first_aid_tips": [
            "Place heel of hand in center of chest, interlock fingers, lock elbows straight.",
            "Push hard and fast (5-6 cm depth), allowing full chest recoil between compressions.",
            "If an AED arrives, power it on immediately and follow voice prompts.",
            "Rotate CPR rescuer every 2 minutes to prevent fatigue and compression decay."
        ]
    },
    "chest_pain": {
        "primary_action": "Seat patient in comfortable W-position (leaning back with knees bent) and keep calm.",
        "secondary_action": "Chew 300mg Aspirin if available and patient is not allergic.",
        "reason": "Suspected acute coronary syndrome or myocardial infarction requiring urgent ECG and Cath-Lab intervention.",
        "severity": "critical",
        "first_aid_tips": [
            "Loosen tight collars, ties, belts, and restrictive clothing.",
            "Ensure constant reassurance; anxiety increases cardiac oxygen demand.",
            "Do NOT allow patient to walk, climb stairs, or exert themselves.",
            "Monitor pulse and respiratory rate every 3 minutes."
        ]
    },
    "stroke": {
        "primary_action": "Record the EXACT time symptoms began and position patient lying on side with head slightly raised.",
        "secondary_action": "Evaluate FAST: Facial droop, Arm weakness, Slurred speech, Time to emergency center.",
        "reason": "Acute cerebral ischemia. Thrombolysis (clot-busting medication) requires arrival within the 4.5-hour golden window.",
        "severity": "critical",
        "first_aid_tips": [
            "Do NOT give anything by mouth — NO food, water, or aspirin (risk of choking or hemorrhagic worsening).",
            "Place in recovery position on side if consciousness decreases or vomiting occurs.",
            "Keep airway unobstructed and speak in calm, short sentences.",
            "Inform paramedics immediately of exact symptom onset time."
        ]
    },
    "head_injury": {
        "primary_action": "Strictly immobilize head and neck; monitor pupil size and consciousness level.",
        "secondary_action": "Cover open cranial lacerations loosely with sterile dressing without pressing down.",
        "reason": "High risk of intracranial hemorrhage, skull fracture, or traumatic brain injury requiring CT imaging.",
        "severity": "critical",
        "first_aid_tips": [
            "Keep spine perfectly aligned; do not turn or tilt head.",
            "Watch for warning signs: unequal pupils, ear/nose fluid drainage, or vomiting.",
            "If patient is vomiting, log-roll entire body together onto side while supporting neck.",
            "Do not wash or press deeply on depressed skull wounds."
        ]
    },
    "bleeding": {
        "primary_action": "Apply firm, direct, continuous pressure over the wound using sterile dressing or clean cloth.",
        "secondary_action": "Elevate injured limb above heart level if no bone fracture is suspected.",
        "reason": "Rapid hemorrhagic volume loss requires immediate manual hemostasis and surgical blood bank support.",
        "severity": "high",
        "first_aid_tips": [
            "Keep continuous pressure for at least 10 minutes without lifting cloth to check.",
            "If blood soaks through, add additional layers directly on top.",
            "For severe limb arterial spurting, apply a commercial or improvised tourniquet 5cm above wound.",
            "Keep patient warm and lying down with legs elevated to combat shock."
        ]
    },
    "breathing": {
        "primary_action": "Help patient sit upright in tripod position (leaning forward with hands on knees) to open airway.",
        "secondary_action": "Assist patient in using prescribed bronchodilator inhaler (Salbutamol) with spacer if available.",
        "reason": "Acute respiratory distress or bronchospasm requiring emergency oxygenation and ventilator readiness.",
        "severity": "critical",
        "first_aid_tips": [
            "Ensure maximum fresh air ventilation; open windows and clear crowding.",
            "Guide patient to practice slow, pursed-lip breathing.",
            "Do NOT allow patient to lie flat on their back.",
            "Observe for bluish tint on lips or fingernails (cyanosis)."
        ]
    },
    "severe_burn": {
        "primary_action": "Cool burn area under cool (not ice-cold) running tap water for 20 continuous minutes.",
        "secondary_action": "Loosely cover with clean plastic cling wrap or sterile non-adherent dressing.",
        "reason": "Thermal tissue damage requires fluid resuscitation, burn ICU stabilization, and infection prevention.",
        "severity": "critical",
        "first_aid_tips": [
            "Do NOT apply ice, ice water, toothpaste, butter, or oil.",
            "Do NOT burst blisters or peel adherent charred clothing from skin.",
            "Remove rings, watches, and restrictive jewelry before swelling develops.",
            "Keep the patient warm with a clean dry sheet over unaffected areas."
        ]
    },
    "fracture": {
        "primary_action": "Immobilize the injured bone and joint in the exact position found using splints or rolled blankets.",
        "secondary_action": "Apply cold pack wrapped in cloth to reduce swelling; check distal pulse.",
        "reason": "Skeletal trauma requiring radiological imaging, orthopedic reduction, and pain management.",
        "severity": "medium",
        "first_aid_tips": [
            "Do NOT attempt to straighten, manipulate, or push exposed bone back in.",
            "Support and splint both the joint above and the joint below the injury.",
            "Check for warmth, sensation, and capillary refill in fingers or toes below injury.",
            "Elevate injured limb gently on pillows if comfortable."
        ]
    }
}


def build_deterministic_plan(
    signals: List[str],
    hospitals: List[HospitalModel],
    vehicle_available: bool = True,
    telemetry: Optional[KineticTelemetry] = None
) -> ActionPlan:
    """Generates instantaneous, high-precision clinical guidance without network latency."""
    top_hospital = hospitals[0].hospital_name if hospitals else "Nearest Apex Trauma Center"
    best_phone = hospitals[0].primary_phone if hospitals else "108"

    # Select primary signal rule
    primary_signal = "automatic_crash_detection"
    for s in signals:
        if s in DETERMINISTIC_RULES:
            primary_signal = s
            break

    rule = DETERMINISTIC_RULES.get(primary_signal, DETERMINISTIC_RULES["automatic_crash_detection"])
    dist_km = hospitals[0].distance_km if hospitals else 1.8
    est_time = f"{max(3, int(dist_km * 2.2))} - {max(6, int(dist_km * 3.5))} mins"

    if not vehicle_available:
        est_time += " (Ambulance En Route)"

    return ActionPlan(
        primary_action=rule["primary_action"],
        secondary_action=rule["secondary_action"],
        reason=f"{rule['reason']} Routed to {top_hospital} ({dist_km:.1f} km away).",
        severity=rule["severity"],
        recommended_hospital=top_hospital,
        estimated_response_time=est_time,
        first_aid_tips=rule["first_aid_tips"],
        tier_used="deterministic_clinical_engine"
    )


def _extract_json_from_text(text: str) -> Optional[dict]:
    """Robust JSON extraction from LLM response text with markdown stripping."""
    if not text:
        return None
    try:
        # 1. Direct JSON parse
        return json.loads(text)
    except Exception:
        pass

    # 2. Extract between curly braces
    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        try:
            return json.loads(match.group(0))
        except Exception:
            pass

    return None


async def _call_openrouter_ai(
    signals: List[str],
    hospitals: List[HospitalModel],
    vehicle_available: bool,
    telemetry: Optional[KineticTelemetry] = None,
    weather_context: str = ""
) -> Optional[ActionPlan]:
    """Queries OpenRouter LLM for deep clinical triage reasoning."""
    api_key = OPENROUTER_API_KEY or DEEPSEEK_API_KEY
    if not api_key:
        return None

    models_to_try = [
        "mistralai/mistral-7b-instruct:free",
        "meta-llama/llama-3.2-3b-instruct:free",
        "google/gemini-2.0-flash-exp:free",
        "qwen/qwen-2.5-7b-instruct:free"
    ]
    endpoint = "https://openrouter.ai/api/v1/chat/completions"

    lines = []
    for i, h in enumerate(hospitals[:4], 1):
        lines.append(
            f"[{i}] {h.hospital_name} | Dist: {h.distance_km}km | State: {h.state} | District: {h.district}\n"
            f"    Specialties: {h.specialties[:150] if h.specialties else 'General Emergency'}\n"
            f"    Facilities: {h.facilities[:120] if h.facilities else 'Emergency Ward'} | Phone: {h.primary_phone}"
        )
    hospital_ctx = "\n".join(lines)

    system_prompt = (
        "You are an expert trauma surgeon and emergency triage director for RoadSOS. "
        "Analyze the patient's symptoms/crash telemetry, evaluate the actual specialties of candidate hospitals, "
        "and provide clear, concise, compassionate, human-readable life-saving advice. "
        "Respond ONLY with a JSON object matching this schema:\n"
        "{\n"
        '  "primary_action": "Immediate directive (1 sentence)",\n'
        '  "secondary_action": "Secondary stabilization step (1 sentence)",\n'
        '  "reason": "Clinical justification (2 sentences)",\n'
        '  "severity": "critical",\n'
        '  "recommended_hospital": "Name of best hospital",\n'
        '  "estimated_response_time": "5-8 minutes",\n'
        '  "first_aid_tips": ["Action 1", "Action 2", "Action 3"]\n'
        "}"
    )

    user_prompt = f"""EMERGENCY CASE:
Signals: {', '.join(signals) if signals else 'Autonomous Crash'}
Road/Weather: {weather_context or 'Normal'}
Transport: {'Personal/Bystander Vehicle' if vehicle_available else 'Ambulance Required'}

CANDIDATE HOSPITALS:
{hospital_ctx}"""

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://roadsos.ai",
        "X-Title": "RoadSOS Emergency Decision Intelligence"
    }

    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            for model_name in models_to_try:
                try:
                    resp = await client.post(
                        endpoint,
                        headers=headers,
                        json={
                            "model": model_name,
                            "messages": [
                                {"role": "system", "content": system_prompt},
                                {"role": "user", "content": user_prompt}
                            ],
                            "temperature": 0.2,
                            "max_tokens": 350
                        }
                    )

                    if resp.status_code == 200:
                        data = resp.json()
                        content = data["choices"][0]["message"]["content"]
                        parsed = _extract_json_from_text(content)

                        if parsed and "primary_action" in parsed:
                            return ActionPlan(
                                primary_action=parsed.get("primary_action", FAILSAFE_PLAN["primary_action"]),
                                secondary_action=parsed.get("secondary_action", FAILSAFE_PLAN["secondary_action"]),
                                reason=parsed.get("reason", "Patient clinically matched to top emergency facility."),
                                severity=parsed.get("severity", "critical"),
                                recommended_hospital=parsed.get("recommended_hospital", hospitals[0].hospital_name if hospitals else "Apex Medical Center"),
                                estimated_response_time=parsed.get("estimated_response_time", "5-8 minutes"),
                                first_aid_tips=parsed.get("first_aid_tips", FAILSAFE_PLAN["first_aid_tips"]),
                                tier_used="neural_ai_triage"
                            )
                except Exception:
                    continue
    except Exception as e:
        logger.warning(f"[AI_TRIAGE] OpenRouter LLM call timed out or failed: {e}. Falling back to deterministic.")

    return None


async def race_triage_decision(
    signals: List[str],
    hospitals: List[HospitalModel],
    vehicle_available: bool = True,
    telemetry: Optional[KineticTelemetry] = None,
    weather_context: str = ""
) -> ActionPlan:
    """
    Dual-engine racing architecture:
    Generates instant sub-5ms deterministic guidance, and races with neural AI.
    Guarantees zero-downtime, sub-second execution with flawless clinical rigor.
    """
    deterministic_plan = build_deterministic_plan(signals, hospitals, vehicle_available, telemetry)

    if not OPENROUTER_API_KEY and not DEEPSEEK_API_KEY:
        return deterministic_plan

    try:
        llm_task = asyncio.create_task(
            _call_openrouter_ai(signals, hospitals, vehicle_available, telemetry, weather_context)
        )
        llm_plan = await asyncio.wait_for(llm_task, timeout=AI_RACE_TIMEOUT_SEC)
        if llm_plan:
            return llm_plan
    except Exception:
        pass

    return deterministic_plan
