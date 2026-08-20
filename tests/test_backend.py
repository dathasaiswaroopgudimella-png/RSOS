"""
RoadSOS — Comprehensive Backend Test Suite
"""

import pytest
from starlette.testclient import TestClient

from backend import database
from backend.ai_triage import build_deterministic_plan
from backend.main import app


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    database.initialize()


def test_spatial_query_accuracy():
    # Hyderabad coordinates: (17.3850, 78.4867)
    hospitals = database.find_nearest_hospitals(17.3850, 78.4867, signals=["cardiac_arrest"], limit=5)
    assert len(hospitals) > 0
    assert hospitals[0].distance_km >= 0.0
    assert hospitals[0].hospital_name != ""
    assert hospitals[0].suitability_score > 0


def test_clinical_suitability_ranking():
    hospitals = database.find_nearest_hospitals(
        17.3850, 78.4867,
        signals=["automatic_crash_detection", "head_injury"],
        limit=5
    )
    assert len(hospitals) > 0
    top = hospitals[0]
    assert len(top.match_reasons) > 0


def test_full_text_search():
    results = database.search_hospitals_fts("Care Hospital", lat=17.3850, lon=78.4867, limit=5)
    assert len(results) > 0
    assert "Care" in results[0].hospital_name or "Hospital" in results[0].hospital_name


def test_deterministic_plan_generation():
    hospitals = database.find_nearest_hospitals(17.3850, 78.4867, signals=["cardiac_arrest"], limit=1)
    plan = build_deterministic_plan(["cardiac_arrest"], hospitals)
    assert "CPR" in plan.primary_action or "cardiac" in plan.reason.lower()
    assert plan.severity == "critical"
    assert len(plan.first_aid_tips) > 0


def test_health_endpoint():
    with TestClient(app) as client:
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["db_stats"]["total_hospitals"] > 0


def test_dispatch_broadcast_endpoint():
    with TestClient(app) as client:
        payload = {
            "lat": 17.3850,
            "lon": 78.4867,
            "patient_name": "Emergency Patient",
            "blood_group": "B+",
            "signals": ["severe_crash"],
            "hospital_name": "City Trauma Center",
            "hospital_phone": "108",
            "crash_severity": "critical",
            "g_force": 5.4
        }
        response = client.post("/api/dispatch/broadcast", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "SOS-" in data["dispatch_id"]
        assert "whatsapp.com" in data["whatsapp_url"]
