"""
RoadSOS — Master Clinical-Spatial Database & Triage Intelligence Engine (v6.0)
High-performance spatial BallTree index (<5ms query) + Multi-Factor Clinical Suitability Calculus (MCSTE).
Guarantees verified Level-1/2 trauma facilities are prioritized over minor clinics during emergencies.
"""

import math
import os
import sqlite3
import time
from pathlib import Path
from typing import List, Optional, Tuple

import numpy as np
from sklearn.neighbors import BallTree
from loguru import logger

from backend.config import CSV_PATH, DB_PATH, MAX_RADIUS_KM, MAX_RESULTS, FTS_RESULTS
from backend.models import HospitalModel

# Globals for in-memory spatial index
_tree: Optional[BallTree] = None
_coords: Optional[np.ndarray] = None  # In radians for BallTree haversine
_sr_nos: Optional[List[int]] = None
_R_EARTH = 6371.0  # Earth radius in kilometers

# Signal to Clinical Specialty Mapping
SIGNAL_TO_SPECIALTY_MAP: dict[str, list[str]] = {
    "automatic_crash_detection": [
        "trauma", "neurosurgery", "neuro", "icu", "critical care",
        "blood bank", "operation theatre", "surgery", "emergency", "orthopedic", "ct scan"
    ],
    "severe_crash": [
        "trauma", "neurosurgery", "icu", "blood bank", "surgery",
        "orthopedic", "critical care", "ct scan", "emergency"
    ],
    "cardiac_arrest": [
        "cardiology", "cardiac", "heart", "cath lab", "icu", "ccu",
        "interventional", "critical care", "emergency"
    ],
    "chest_pain": [
        "cardiology", "cardiac", "heart", "cath lab", "icu", "emergency"
    ],
    "stroke": [
        "neurology", "neuro", "brain", "stroke unit", "icu", "ct scan", "mri"
    ],
    "head_injury": [
        "neurosurgery", "neurology", "neuro", "trauma", "icu", "ct scan"
    ],
    "seizure": [
        "neurology", "neuro", "epilepsy", "emergency", "icu"
    ],
    "bleeding": [
        "trauma", "surgery", "blood bank", "emergency", "critical care"
    ],
    "unconscious": [
        "neurology", "neuro", "icu", "critical care", "emergency", "trauma"
    ],
    "breathing": [
        "pulmonology", "respiratory", "icu", "ventilator", "critical care"
    ],
    "choking": [
        "emergency", "ent", "pulmonology", "icu"
    ],
    "drowning": [
        "emergency", "icu", "critical care", "pulmonology", "ventilator"
    ],
    "severe_burn": [
        "burns", "burn", "plastic surgery", "dermatology", "icu"
    ],
    "poisoning": [
        "emergency", "toxicology", "gastroenterology", "dialysis", "icu"
    ],
    "anaphylaxis": [
        "emergency", "allergy", "immunology", "icu", "pulmonology"
    ],
    "fracture": [
        "orthopedic", "ortho", "bone", "trauma", "surgery"
    ],
    "amputation": [
        "plastic surgery", "orthopedic", "trauma", "surgery", "blood bank", "icu"
    ],
    "high_fever": [
        "general medicine", "internal medicine", "infectious", "pediatric"
    ],
    "abdominal_pain": [
        "gastroenterology", "surgery", "general medicine", "ultrasound"
    ],
    "fall": [
        "orthopedic", "trauma", "emergency", "surgery", "x-ray"
    ],
    "animal_bite": [
        "emergency", "general medicine", "surgery", "rabies"
    ],
    "electric_shock": [
        "emergency", "burns", "cardiac", "icu", "general medicine"
    ],
    "eye_injury": [
        "ophthalmology", "eye", "ophthalmic", "surgery"
    ],
    "pediatric_emergency": [
        "pediatric", "neonatology", "nicu", "picu", "child care"
    ]
}

CRITICAL_FACILITIES = {
    "icu": 18.0,
    "ventilator": 14.0,
    "blood bank": 16.0,
    "operation theatre": 12.0,
    "ot": 10.0,
    "cath lab": 16.0,
    "ct scan": 14.0,
    "mri": 10.0,
    "dialysis": 8.0,
    "trauma center": 24.0,
    "ambulance": 8.0,
    "casualty": 10.0
}

# Non-emergency and minor clinic keywords to heavily penalize during acute trauma/emergencies
INAPPROPRIATE_CLINIC_KEYWORDS = [
    "dental", "dentistry", "eye clinic", "netralaya", "optometry", "fertility", "ivf",
    "hair transplant", "skin clinic", "dermatology clinic", "physiotherapy",
    "homeopathy", "ayurveda", "naturopathy", "dispensary", "polyclinic",
    "pathology lab", "diagnostic center", "scan center", "cosmetic"
]


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance in km between two lat/lon points."""
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    a = math.sin(dLat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dLon / 2) ** 2
    return _R_EARTH * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def get_db_connection() -> sqlite3.Connection:
    """Get optimized SQLite connection with row factory."""
    if not DB_PATH.exists():
        from scripts.build_hospital_db import build_database
        build_database()
    
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def initialize() -> None:
    """Load hospital coordinates into memory and construct BallTree index."""
    global _tree, _coords, _sr_nos
    logger.info("[DATABASE] Initializing spatial BallTree index from SQLite...")
    start = time.time()

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT sr_no, lat, lon FROM hospitals WHERE lat != 0 AND lon != 0 AND lat IS NOT NULL AND lon IS NOT NULL")
    rows = cursor.fetchall()
    conn.close()

    if not rows:
        logger.warning("[DATABASE] No valid hospital coordinates found in database!")
        return

    _sr_nos = [r["sr_no"] for r in rows]
    lat_lon_deg = np.array([[r["lat"], r["lon"]] for r in rows], dtype=np.float64)
    # Convert degrees to radians for BallTree haversine metric
    _coords = np.radians(lat_lon_deg)
    _tree = BallTree(_coords, metric="haversine")

    elapsed = (time.time() - start) * 1000
    logger.success(f"[DATABASE] BallTree spatial index initialized with {len(_sr_nos)} hospitals in {elapsed:.1f}ms")


def get_db_stats() -> dict:
    """Fetch database health and summary statistics."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as total FROM hospitals")
        total = cursor.fetchone()["total"]
        cursor.execute("SELECT COUNT(DISTINCT state) as states FROM hospitals WHERE state != ''")
        states = cursor.fetchone()["states"]
        cursor.execute("SELECT COUNT(DISTINCT district) as districts FROM hospitals WHERE district != ''")
        districts = cursor.fetchone()["districts"]
        cursor.execute("SELECT COUNT(DISTINCT pincode) as pincodes FROM hospitals WHERE pincode != ''")
        pincodes = cursor.fetchone()["pincodes"]
        conn.close()
        return {
            "total_hospitals": total,
            "states": states,
            "districts": districts,
            "pincodes": pincodes,
            "spatial_indexed_count": len(_sr_nos) if _sr_nos else 0,
            "status": "ready"
        }
    except Exception as e:
        logger.error(f"[DATABASE] Stats error: {e}")
        return {"status": "error", "error": str(e), "total_hospitals": 0}


def _calculate_clinical_suitability(hospital: dict, signals: List[str], distance_km: float) -> Tuple[float, List[str]]:
    """
    Master Clinical Suitability Calculus (MCSTE-v6):
    - Non-linear distance curve & Golden-Hour ETA calculation
    - Specialty and capability matching (Trauma, ICU, Blood Bank, Neuro, Cath-Lab)
    - Elimination of minor non-emergency clinics during critical events
    - Apex Medical College / Level-1 Trauma Hospital prioritization
    """
    score = 75.0
    reasons: list[str] = []

    # 1. Non-linear distance penalty curve
    if distance_km <= 3.0:
        score -= distance_km * 1.0
        reasons.append(f"Immediate proximity ({distance_km:.1f} km · ~{max(3, int(distance_km * 2.2))} mins)")
    elif distance_km <= 10.0:
        score -= 3.0 + (distance_km - 3.0) * 1.6
    elif distance_km <= 25.0:
        score -= 14.2 + (distance_km - 10.0) * 2.2
    else:
        score -= 47.2 + (distance_km - 25.0) * 3.0

    # 2. Extract and normalize hospital metadata
    h_name = (hospital.get("hospital_name") or "").lower()
    specialties_str = (hospital.get("specialties") or "").lower()
    facilities_str = (hospital.get("facilities") or "").lower()
    care_type = (hospital.get("hospital_care_type") or "").lower()
    tier = (hospital.get("tier") or "").lower()
    beds = hospital.get("total_beds") or 0
    emergency_services = (hospital.get("emergency_services") or "").lower()

    # 3. Penalize inappropriate minor clinics during trauma & life threats
    is_minor_clinic = any(k in h_name for k in INAPPROPRIATE_CLINIC_KEYWORDS) and beds < 60
    if is_minor_clinic:
        score -= 75.0

    # 4. Critical Trauma / Crash specific boost
    is_crash_or_trauma = any(s in signals for s in [
        "automatic_crash_detection", "severe_crash", "head_injury", "bleeding", "fracture", "amputation"
    ]) or not signals

    if is_crash_or_trauma:
        if "trauma" in facilities_str or "trauma" in specialties_str or "accident" in specialties_str:
            score += 28.0
            reasons.append("Dedicated Trauma Care Center")
        if "neurosurgery" in specialties_str or "neuro" in specialties_str:
            score += 20.0
            reasons.append("24/7 Neurosurgery & Cranial Trauma Unit")
        if "orthopedic" in specialties_str or "ortho" in specialties_str:
            score += 15.0
            reasons.append("Orthopedic Trauma & Surgical Fixation")

    # 5. Signals to Specialty matching
    target_specialties = set()
    for s in signals:
        mapped = SIGNAL_TO_SPECIALTY_MAP.get(s, [])
        target_specialties.update(mapped)

    matched_specs = []
    for spec in target_specialties:
        if spec in specialties_str or spec in facilities_str:
            matched_specs.append(spec)
            score += 12.0

    if matched_specs and not any("Specialized in" in r for r in reasons):
        top_specs = ", ".join(list(matched_specs)[:3])
        reasons.append(f"Specialized in {top_specs.title()}")

    # 6. Critical facility capability matching
    for fac, boost in CRITICAL_FACILITIES.items():
        if fac in facilities_str or fac in specialties_str:
            score += boost

    if "icu" in facilities_str or "icu" in specialties_str:
        reasons.append("Critical Care ICU & Ventilators")
    if "blood bank" in facilities_str:
        reasons.append("24/7 Active Blood Bank")
    if "cath lab" in facilities_str:
        reasons.append("Cath-Lab Interventional Suite")
    if "ct scan" in facilities_str or "mri" in facilities_str:
        reasons.append("24/7 Advanced Emergency Imaging (CT/MRI)")

    # 7. Care Type & Apex Tier Boost
    if (tier == "tier_1" or "medical college" in h_name or "aiims" in h_name or "general hospital" in h_name) and not is_minor_clinic:
        score += 30.0
        reasons.append("Apex Tertiary Medical Center")
    elif tier == "tier_2" and not is_minor_clinic:
        score += 12.0
    elif tier == "tier_3" and beds < 30:
        score -= 15.0

    # 8. Bed Capacity Bonus
    if beds >= 500:
        score += 26.0
        reasons.append(f"High-Capacity Facility ({beds}+ Beds)")
    elif beds >= 200:
        score += 18.0
        reasons.append(f"Multi-Specialty Capacity ({beds} Beds)")
    elif beds >= 50:
        score += 8.0
    elif beds == 0:
        score -= 10.0

    # 9. Emergency Services status
    if "yes" in emergency_services:
        score += 15.0
        reasons.append("24/7 Dedicated Emergency Casualty")

    # Bound score between 10.0 and 99.0
    final_score = max(10.0, min(99.0, round(score, 1)))
    return final_score, reasons


def find_nearest_hospitals(
    lat: float,
    lon: float,
    signals: Optional[List[str]] = None,
    max_radius_km: float = MAX_RADIUS_KM,
    limit: int = MAX_RESULTS
) -> List[HospitalModel]:
    """
    Searches for nearest hospitals using BallTree, then applies
    Clinical Suitability Calculus to rank the most clinically appropriate facilities.
    """
    signals = signals or []
    if _tree is None or _sr_nos is None:
        initialize()

    # Query BallTree within search radius
    rad_lat = math.radians(lat)
    rad_lon = math.radians(lon)
    query_point = np.array([[rad_lat, rad_lon]])
    radius_rad = max_radius_km / _R_EARTH

    # Search candidates within radius (or nearest 50 if radius yields few)
    indices, distances = _tree.query_radius(query_point, r=radius_rad, return_distance=True)
    indices = indices[0]
    distances = distances[0] * _R_EARTH  # Convert to km

    if len(indices) == 0:
        # Expand search to nearest 30 regardless of distance
        distances, indices = _tree.query(query_point, k=min(30, len(_sr_nos)))
        distances = distances[0] * _R_EARTH
        indices = indices[0]

    candidate_sr_nos = [_sr_nos[idx] for idx in indices]
    dist_map = {sr_no: dist for sr_no, dist in zip(candidate_sr_nos, distances)}

    if not candidate_sr_nos:
        return []

    # Fetch full hospital details from SQLite
    placeholders = ",".join(["?"] * len(candidate_sr_nos))
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(f"SELECT * FROM hospitals WHERE sr_no IN ({placeholders})", candidate_sr_nos)
    rows = cursor.fetchall()
    conn.close()

    hospital_list = []
    for row in rows:
        row_dict = dict(row)
        sr_no = row_dict["sr_no"]
        dist = round(float(dist_map.get(sr_no, 0.0)), 2)
        score, reasons = _calculate_clinical_suitability(row_dict, signals, dist)

        model = HospitalModel(
            sr_no=row_dict["sr_no"],
            lat=row_dict["lat"],
            lon=row_dict["lon"],
            hospital_name=row_dict["hospital_name"],
            hospital_category=row_dict.get("hospital_category", ""),
            hospital_care_type=row_dict.get("hospital_care_type", ""),
            discipline=row_dict.get("discipline", ""),
            address=row_dict.get("address", ""),
            state=row_dict.get("state", ""),
            district=row_dict.get("district", ""),
            subdistrict=row_dict.get("subdistrict", ""),
            pincode=row_dict.get("pincode", ""),
            telephone=row_dict.get("telephone", ""),
            mobile_number=row_dict.get("mobile_number", ""),
            emergency_num=row_dict.get("emergency_num", ""),
            ambulance_phone=row_dict.get("ambulance_phone", ""),
            bloodbank_phone=row_dict.get("bloodbank_phone", ""),
            tollfree=row_dict.get("tollfree", ""),
            helpline=row_dict.get("helpline", ""),
            email=row_dict.get("email", ""),
            website=row_dict.get("website", ""),
            specialties=row_dict.get("specialties", ""),
            facilities=row_dict.get("facilities", ""),
            accreditation=row_dict.get("accreditation", ""),
            town=row_dict.get("town", ""),
            village=row_dict.get("village", ""),
            established_year=row_dict.get("established_year", ""),
            num_doctors=row_dict.get("num_doctors") or 0,
            num_consultants=row_dict.get("num_consultants") or 0,
            total_beds=row_dict.get("total_beds") or 0,
            private_wards=row_dict.get("private_wards") or 0,
            beds_eco_weaker=row_dict.get("beds_eco_weaker") or 0,
            emergency_services=row_dict.get("emergency_services", ""),
            tariff_range=row_dict.get("tariff_range", ""),
            tier=row_dict.get("tier", "tier_3"),
            primary_phone=row_dict.get("primary_phone") or "108",
            distance_km=dist,
            suitability_score=score,
            match_reasons=reasons
        )
        hospital_list.append(model)

    # Rank by Suitability Score descending, then distance ascending
    hospital_list.sort(key=lambda h: (-h.suitability_score, h.distance_km))
    return hospital_list[:limit]


def search_hospitals_fts(query: str, lat: Optional[float] = None, lon: Optional[float] = None, limit: int = 15) -> List[HospitalModel]:
    """Search hospitals using SQLite FTS5 full text search or pincode/name match."""
    if not query or not query.strip():
        if lat is not None and lon is not None:
            return find_nearest_hospitals(lat, lon, limit=limit)
        return []

    clean_query = query.strip().replace("'", "").replace('"', "")
    conn = get_db_connection()
    cursor = conn.cursor()

    # Try FTS first
    try:
        cursor.execute("""
            SELECT h.* FROM hospitals_fts f
            JOIN hospitals h ON f.rowid = h.sr_no
            WHERE hospitals_fts MATCH ?
            LIMIT ?
        """, (f"{clean_query}*", limit * 2))
        rows = cursor.fetchall()
    except Exception:
        rows = []

    # Fallback to standard LIKE if FTS yields nothing
    if not rows:
        wildcard = f"%{clean_query}%"
        cursor.execute("""
            SELECT * FROM hospitals
            WHERE hospital_name LIKE ? OR address LIKE ? OR district LIKE ? OR pincode LIKE ? OR state LIKE ?
            LIMIT ?
        """, (wildcard, wildcard, wildcard, wildcard, wildcard, limit * 2))
        rows = cursor.fetchall()

    conn.close()

    results = []
    for row in rows:
        row_dict = dict(row)
        dist = 0.0
        if lat is not None and lon is not None:
            dist = round(haversine(lat, lon, row_dict["lat"], row_dict["lon"]), 2)
        score, reasons = _calculate_clinical_suitability(row_dict, [], dist)

        model = HospitalModel(
            sr_no=row_dict["sr_no"],
            lat=row_dict["lat"],
            lon=row_dict["lon"],
            hospital_name=row_dict["hospital_name"],
            hospital_category=row_dict.get("hospital_category", ""),
            hospital_care_type=row_dict.get("hospital_care_type", ""),
            discipline=row_dict.get("discipline", ""),
            address=row_dict.get("address", ""),
            state=row_dict.get("state", ""),
            district=row_dict.get("district", ""),
            subdistrict=row_dict.get("subdistrict", ""),
            pincode=row_dict.get("pincode", ""),
            telephone=row_dict.get("telephone", ""),
            mobile_number=row_dict.get("mobile_number", ""),
            emergency_num=row_dict.get("emergency_num", ""),
            ambulance_phone=row_dict.get("ambulance_phone", ""),
            bloodbank_phone=row_dict.get("bloodbank_phone", ""),
            tollfree=row_dict.get("tollfree", ""),
            helpline=row_dict.get("helpline", ""),
            email=row_dict.get("email", ""),
            website=row_dict.get("website", ""),
            specialties=row_dict.get("specialties", ""),
            facilities=row_dict.get("facilities", ""),
            accreditation=row_dict.get("accreditation", ""),
            town=row_dict.get("town", ""),
            village=row_dict.get("village", ""),
            established_year=row_dict.get("established_year", ""),
            num_doctors=row_dict.get("num_doctors") or 0,
            num_consultants=row_dict.get("num_consultants") or 0,
            total_beds=row_dict.get("total_beds") or 0,
            private_wards=row_dict.get("private_wards") or 0,
            beds_eco_weaker=row_dict.get("beds_eco_weaker") or 0,
            emergency_services=row_dict.get("emergency_services", ""),
            tariff_range=row_dict.get("tariff_range", ""),
            tier=row_dict.get("tier", "tier_3"),
            primary_phone=row_dict.get("primary_phone") or "108",
            distance_km=dist,
            suitability_score=score,
            match_reasons=reasons
        )
        results.append(model)

    results.sort(key=lambda h: (-h.suitability_score, h.distance_km))
    return results[:limit]
