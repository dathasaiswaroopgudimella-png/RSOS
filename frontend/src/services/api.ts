/**
 * RoadSOS Frontend API Client
 * Fail-safe HTTP client with offline fallback datasets.
 */

import { EmergencyResponse, Hospital, KineticTelemetry, SystemHealth } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '';

// High-fidelity fallback database for major Indian metro trauma centers (Zero-network fail-safe)
export const FALLBACK_HOSPITALS: Hospital[] = [
  {
    sr_no: 575,
    lat: 17.385044,
    lon: 78.486671,
    hospital_name: "Nizams Institute of Medical Sciences (NIMS)",
    hospital_category: "Public/ Government",
    hospital_care_type: "Apex Medical Institute / Level-1 Trauma",
    discipline: "Allopathic",
    address: "Punjagutta, Hyderabad, Telangana",
    state: "Telangana",
    district: "Hyderabad",
    pincode: "500082",
    primary_phone: "040 23390933",
    emergency_num: "040 23390933",
    ambulance_phone: "040 23399690",
    specialties: "Trauma Surgery, Emergency Medicine, Cardiology, Neurosurgery, Critical Care, Orthopedics",
    facilities: "24/7 Level-1 Trauma Center, 120-Bed ICU, CT Scan, MRI, Blood Bank, Ventilators",
    accreditation: "Government Apex Institute",
    total_beds: 1400,
    emergency_services: "Yes",
    tier: "tier_1",
    distance_km: 1.8,
    suitability_score: 98.5,
    match_reasons: ["Equipped Level-1 Trauma Center", "Neurosurgery & Critical Care ICU", "Immediate Proximity (1.8 km)"]
  },
  {
    sr_no: 6,
    lat: 17.4274003,
    lon: 78.4311174,
    hospital_name: "Care Hospital, Banjara Hills",
    hospital_category: "Private",
    hospital_care_type: "Super Speciality Hospital",
    discipline: "Allopathic",
    address: "Road No. 1, Banjara Hills, Hyderabad",
    state: "Telangana",
    district: "Hyderabad",
    pincode: "500034",
    primary_phone: "040 30418888",
    emergency_num: "040 30418888",
    ambulance_phone: "040 66668888",
    tollfree: "18001086666",
    specialties: "Cardiology, Cardiothoracic Surgery, Emergency Medicine, Neuro Surgery, Orthopedics and Traumatology",
    facilities: "Ambulance, Blood Bank, Casualty, Diagnostic Services, Dialysis Unit, Emergency Room, ICU",
    accreditation: "NABH Accredited",
    total_beds: 500,
    emergency_services: "Yes",
    tier: "tier_1",
    distance_km: 4.2,
    suitability_score: 94.0,
    match_reasons: ["24/7 Dedicated Emergency Services", "Cath Lab & Cardiac ICU", "Blood Bank Available"]
  },
  {
    sr_no: 565,
    lat: 17.406396,
    lon: 78.471592,
    hospital_name: "Mediciti Hospital",
    hospital_category: "Private",
    hospital_care_type: "Hospital",
    discipline: "Allopathic",
    address: "5-9-22, Secretariat Road, Hyderabad",
    state: "Telangana",
    district: "Hyderabad",
    pincode: "500063",
    primary_phone: "040 23231111",
    emergency_num: "040 23231111",
    specialties: "Anaesthesiology, Cardiology, Critical Care, Emergency Medicine, Neurology, Orthopedics, Trauma Unit",
    facilities: "Accident & Emergency Ward, Multispeciality ICU, Neuro ICU, Ventilators",
    accreditation: "NABH Accredited",
    total_beds: 300,
    emergency_services: "Yes",
    tier: "tier_2",
    distance_km: 3.1,
    suitability_score: 89.2,
    match_reasons: ["Accident & Emergency Ward", "Multispeciality ICU", "Proximity (3.1 km)"]
  }
];

export class ApiService {
  /**
   * Primary Emergency Triage API Call
   */
  static async requestEmergencyGuidance(params: {
    lat: number;
    lon: number;
    signals: string[];
    vehicleAvailable: boolean;
    telemetry?: KineticTelemetry;
    notes?: string;
  }): Promise<EmergencyResponse> {
    try {
      const response = await fetch(`${API_BASE}/api/emergency/guidance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: params.lat,
          lon: params.lon,
          signals: params.signals,
          vehicle_available: params.vehicleAvailable,
          telemetry: params.telemetry,
          notes: params.notes,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      return await response.json();
    } catch (err: any) {
      console.warn('[API] Emergency guidance network error, using fail-safe offline intelligence:', err.message);

      const isCrash = params.signals.includes('automatic_crash_detection') || params.signals.includes('severe_crash');
      return {
        status: 'fallback_offline',
        plan: {
          primary_action: isCrash
            ? 'Severe collision detected. Keep patient still and immobilize cervical spine.'
            : 'Call Emergency Ambulance (108) immediately and keep patient stationary.',
          secondary_action: 'Check airway and breathing. Apply direct firm pressure to heavy bleeding.',
          reason: 'Offline fail-safe clinical triage activated. Routed to highest-capacity regional trauma facility.',
          severity: 'critical',
          recommended_hospital: FALLBACK_HOSPITALS[0].hospital_name,
          estimated_response_time: '4-7 minutes',
          first_aid_tips: [
            'Do NOT remove helmet if spinal injury is suspected unless airway is obstructed.',
            'Apply direct sterile pressure bandages to active bleeding wounds.',
            'Keep patient warm and lie flat with legs elevated if conscious and not vomiting.',
            'Dial 108 (Ambulance) or 112 (National Emergency).'
          ],
          tier_used: 'client_offline_failsafe'
        },
        hospitals: FALLBACK_HOSPITALS,
        weather: {
          condition: 'Clear',
          temperature_c: 28,
          rain_mm: 0,
          wind_kmh: 12,
          visibility_km: 10,
          road_condition: 'Dry & Clear'
        },
        metadata: {
          latency_ms: 2.0,
          tier_used: 'client_offline_failsafe',
          error: err.message
        }
      };
    }
  }

  /**
   * Search Hospitals by Query
   */
  static async searchHospitals(query: string, lat?: number, lon?: number): Promise<Hospital[]> {
    try {
      const response = await fetch(`${API_BASE}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, lat, lon, limit: 10 }),
      });
      if (response.ok) {
        const data = await response.json();
        return data.results || [];
      }
    } catch (e) {
      console.warn('[API] Hospital search offline fallback');
    }
    return FALLBACK_HOSPITALS.filter(h =>
      h.hospital_name.toLowerCase().includes(query.toLowerCase()) ||
      h.address?.toLowerCase().includes(query.toLowerCase())
    );
  }

  /**
   * Check System Health
   */
  static async getHealth(): Promise<SystemHealth | null> {
    try {
      const response = await fetch(`${API_BASE}/api/health`);
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.warn('[API] Health check failed');
    }
    return null;
  }

  /**
   * Generate Dispatch Payload
   */
  static async createDispatchBroadcast(payload: {
    lat: number;
    lon: number;
    patient_name?: string;
    blood_group?: string;
    signals: string[];
    hospital_name: string;
    hospital_phone: string;
    crash_severity?: string;
    g_force?: number;
  }): Promise<{ whatsapp_url: string; sms_payload: string; dispatch_id: string }> {
    try {
      const response = await fetch(`${API_BASE}/api/dispatch/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (_) {}

    const mapsLink = `https://www.google.com/maps/search/?api=1&query=${payload.lat},${payload.lon}`;
    const sms = `🚨 [ROADSOS SOS] EMERGENCY at: ${mapsLink} | Hospital: ${payload.hospital_name} (${payload.hospital_phone})`;
    return {
      dispatch_id: `SOS-${Date.now()}`,
      sms_payload: sms,
      whatsapp_url: `https://api.whatsapp.com/send?text=${encodeURIComponent(sms)}`
    };
  }
}
