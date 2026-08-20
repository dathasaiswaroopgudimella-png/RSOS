"""
RoadSOS — Pydantic Data Models (v5.0)
Defines strict validation schemas for requests, responses, telemetry, and clinical objects.
"""

from typing import Any, List, Optional
from pydantic import BaseModel, Field


class HospitalModel(BaseModel):
    sr_no: int
    lat: float
    lon: float
    hospital_name: str
    hospital_category: Optional[str] = ""
    hospital_care_type: Optional[str] = ""
    discipline: Optional[str] = ""
    address: Optional[str] = ""
    state: Optional[str] = ""
    district: Optional[str] = ""
    subdistrict: Optional[str] = ""
    pincode: Optional[str] = ""
    telephone: Optional[str] = ""
    mobile_number: Optional[str] = ""
    emergency_num: Optional[str] = ""
    ambulance_phone: Optional[str] = ""
    bloodbank_phone: Optional[str] = ""
    tollfree: Optional[str] = ""
    helpline: Optional[str] = ""
    email: Optional[str] = ""
    website: Optional[str] = ""
    specialties: Optional[str] = ""
    facilities: Optional[str] = ""
    accreditation: Optional[str] = ""
    town: Optional[str] = ""
    village: Optional[str] = ""
    established_year: Optional[str] = ""
    num_doctors: Optional[int] = 0
    num_consultants: Optional[int] = 0
    total_beds: Optional[int] = 0
    private_wards: Optional[int] = 0
    beds_eco_weaker: Optional[int] = 0
    emergency_services: Optional[str] = ""
    tariff_range: Optional[str] = ""
    tier: Optional[str] = "tier_3"
    primary_phone: Optional[str] = "108"
    distance_km: float = 0.0
    suitability_score: float = 0.0
    match_reasons: List[str] = Field(default_factory=list)


class KineticTelemetry(BaseModel):
    g_force: Optional[float] = 1.0
    accel_x: Optional[float] = 0.0
    accel_y: Optional[float] = 0.0
    accel_z: Optional[float] = 9.8
    speed_kmh: Optional[float] = 0.0
    delta_speed_kmh: Optional[float] = 0.0
    tilt_angle_deg: Optional[float] = 0.0
    anomaly_type: Optional[str] = None  # "impact", "sudden_stop", "rollover", "manual"
    timestamp: Optional[int] = None


class EmergencyRequest(BaseModel):
    lat: float
    lon: float
    signals: List[str] = Field(default_factory=list)
    vehicle_available: bool = True
    telemetry: Optional[KineticTelemetry] = None
    patient_info: Optional[dict] = Field(default_factory=dict)
    notes: Optional[str] = ""


class ActionPlan(BaseModel):
    primary_action: str
    secondary_action: str
    reason: str
    severity: str
    recommended_hospital: str
    estimated_response_time: str
    first_aid_tips: List[str] = Field(default_factory=list)
    tier_used: str = "deterministic"


class WeatherInfo(BaseModel):
    condition: str = "Clear"
    temperature_c: float = 28.0
    rain_mm: float = 0.0
    wind_kmh: float = 12.0
    visibility_km: float = 10.0
    road_condition: str = "Dry & Normal"


class EmergencyResponse(BaseModel):
    status: str
    plan: ActionPlan
    hospitals: List[HospitalModel]
    weather: Optional[WeatherInfo] = None
    metadata: dict = Field(default_factory=dict)


class SearchRequest(BaseModel):
    query: str
    lat: Optional[float] = None
    lon: Optional[float] = None
    limit: int = 15


class SearchResponse(BaseModel):
    status: str
    count: int
    results: List[HospitalModel]


class GeocodeRequest(BaseModel):
    address: str


class GeocodeResponse(BaseModel):
    status: str
    lat: Optional[float] = None
    lon: Optional[float] = None
    display_name: Optional[str] = None
    source: str = "none"


class HealthResponse(BaseModel):
    status: str
    db_stats: dict
    api_keys: dict
    version: str = "5.0.0"


class DispatchBroadcastRequest(BaseModel):
    lat: float
    lon: float
    patient_name: Optional[str] = "Emergency Patient"
    blood_group: Optional[str] = "Unknown"
    signals: List[str] = Field(default_factory=list)
    hospital_name: str
    hospital_phone: str
    crash_severity: str = "critical"
    g_force: Optional[float] = None
    speed: Optional[float] = None
    emergency_contacts: List[dict] = Field(default_factory=list)


class DispatchBroadcastResponse(BaseModel):
    status: str
    dispatch_id: str
    timestamp: str
    sms_payload: str
    whatsapp_url: str
    alert_summary: str
