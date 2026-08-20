export type EmergencyState = 'IDLE' | 'ANALYZING' | 'ACTIVE' | 'RESOLVED';
export type AppMode = 'AUTOMATIC' | 'MANUAL';

export interface Hospital {
  sr_no: number;
  lat: number;
  lon: number;
  hospital_name: string;
  hospital_category?: string;
  hospital_care_type?: string;
  discipline?: string;
  address?: string;
  state?: string;
  district?: string;
  subdistrict?: string;
  pincode?: string;
  telephone?: string;
  mobile_number?: string;
  emergency_num?: string;
  ambulance_phone?: string;
  bloodbank_phone?: string;
  tollfree?: string;
  helpline?: string;
  email?: string;
  website?: string;
  specialties?: string;
  facilities?: string;
  accreditation?: string;
  town?: string;
  village?: string;
  established_year?: string;
  num_doctors?: number;
  num_consultants?: number;
  total_beds?: number;
  private_wards?: number;
  beds_eco_weaker?: number;
  emergency_services?: string;
  tariff_range?: string;
  tier?: string;
  primary_phone?: string;
  distance_km: number;
  suitability_score: number;
  match_reasons?: string[];
}

export interface ActionPlan {
  primary_action: string;
  secondary_action: string;
  reason: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  recommended_hospital: string;
  estimated_response_time: string;
  first_aid_tips: string[];
  tier_used?: string;
}

export interface WeatherInfo {
  condition: string;
  temperature_c: number;
  rain_mm: number;
  wind_kmh: number;
  visibility_km: number;
  road_condition: string;
}

export interface KineticTelemetry {
  g_force: number;
  accel_x: number;
  accel_y: number;
  accel_z: number;
  speed_kmh: number;
  delta_speed_kmh: number;
  tilt_angle_deg: number;
  anomaly_type?: 'impact' | 'sudden_stop' | 'rollover' | 'manual' | 'deadman_switch' | null;
  timestamp: number;
}

export interface SentinelAlert {
  type: 'impact' | 'sudden_stop' | 'rollover' | 'deadman_switch';
  timestamp: number;
  telemetry: KineticTelemetry;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relation: string;
  notifyOnSos: boolean;
}

export interface MedicalProfile {
  name: string;
  age: string;
  bloodGroup: string;
  allergies: string;
  conditions: string;
  emergencyNotes: string;
  vehicleReg: string;
}

export interface EmergencyResponse {
  status: string;
  plan: ActionPlan;
  hospitals: Hospital[];
  weather?: WeatherInfo;
  metadata?: {
    latency_ms?: number;
    hospitals_evaluated?: number;
    tier_used?: string;
    error?: string;
  };
}

export interface SystemHealth {
  status: string;
  db_stats: {
    total_hospitals: number;
    states: number;
    districts: number;
    pincodes: number;
    spatial_indexed_count: number;
  };
  api_keys: {
    data_gov_in: boolean;
    openrouter: boolean;
    deepseek: boolean;
    opencage: boolean;
    geoapify: boolean;
    weather: boolean;
    ipinfo: boolean;
  };
}
