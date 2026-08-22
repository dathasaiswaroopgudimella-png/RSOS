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
    tier: "tier_1",
    distance_km: 3.1,
    suitability_score: 89.0,
    match_reasons: ["Emergency Triage Center", "24/7 Blood Bank & Operation Theatre"]
  }
];

export interface EmergencyGuidanceParams {
  lat: number;
  lon: number;
  signals: string[];
  vehicleAvailable?: boolean;
  telemetry?: KineticTelemetry;
  notes?: string;
}

export class ApiService {
  /**
   * Primary Emergency Triage Dispatch
   */
  static async requestEmergencyGuidance(params: EmergencyGuidanceParams): Promise<EmergencyResponse> {
    const start = performance.now();
    try {
      const resp = await fetch(`${API_BASE}/api/emergency/guidance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: params.lat,
          lon: params.lon,
          signals: params.signals,
          vehicle_available: params.vehicleAvailable ?? true,
          telemetry: params.telemetry,
          notes: params.notes || ''
        }),
      });

      if (!resp.ok) {
        throw new Error(`API server responded with HTTP ${resp.status}`);
      }

      const data: EmergencyResponse = await resp.json();
      return data;
    } catch (err) {
      console.warn('[API] Backend unreachable or failed, utilizing zero-latency fallback:', err);
      const elapsed = Math.round(performance.now() - start);

      const top = FALLBACK_HOSPITALS[0];
      return {
        status: 'fallback',
        plan: {
          primary_action: params.signals.includes('cardiac_arrest')
            ? 'Start immediate Hands-Only CPR in center of chest (100-120 bpm).'
            : 'Keep patient stationary with neutral neck alignment. Control external bleeding.',
          secondary_action: 'Dispatch emergency ambulance and notify receiving trauma team.',
          reason: `Immediate clinical triage required. Routed to ${top.hospital_name} (${top.distance_km} km).`,
          severity: 'critical',
          recommended_hospital: top.hospital_name,
          estimated_response_time: '4 - 7 mins',
          first_aid_tips: [
            'Maintain cervical spine stabilization.',
            'Apply firm direct pressure to active bleeding.',
            'Keep patient warm and calm.',
            'Clear the area for emergency personnel.'
          ],
          tier_used: 'client_edge_fallback'
        },
        hospitals: FALLBACK_HOSPITALS,
        metadata: {
          latency_ms: elapsed,
          tier_used: 'edge_client_failsafe'
        }
      };
    }
  }

  /**
   * Auto-detect location via IP
   */
  static async getIpLocation(): Promise<{ lat: number; lon: number; display_name: string } | null> {
    try {
      const resp = await fetch(`${API_BASE}/api/geocode/ip`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.status === 'ok' && data.lat && data.lon) {
          return { lat: data.lat, lon: data.lon, display_name: data.display_name };
        }
      }
    } catch (e) {
      console.warn('[API] IP Geocode backend error, trying direct ipapi:', e);
    }

    // Direct client-side ipapi fallback
    try {
      const r = await fetch('https://ipapi.co/json/');
      if (r.ok) {
        const d = await r.json();
        if (d.latitude && d.longitude) {
          return {
            lat: parseFloat(d.latitude),
            lon: parseFloat(d.longitude),
            display_name: `${d.city || ''}, ${d.region || ''} (IP Location)`
          };
        }
      }
    } catch (e) {
      console.warn('[API] Client IP fallback failed:', e);
    }

    return null;
  }

  /**
   * Reverse Geocode (Lat, Lon -> Human Name)
   */
  static async reverseGeocode(lat: number, lon: number): Promise<string> {
    try {
      const resp = await fetch(`${API_BASE}/api/reverse-geocode?lat=${lat}&lon=${lon}`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.display_name) {
          return data.display_name;
        }
      }
    } catch (e) {
      console.warn('[API] Reverse geocode error:', e);
    }

    // Client-side Nominatim fallback
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
      if (r.ok) {
        const d = await r.json();
        const a = d.address || {};
        const road = a.road || a.suburb || a.neighbourhood || '';
        const city = a.city || a.town || a.county || '';
        const state = a.state || '';
        const parts = [road, city, state].filter(Boolean);
        if (parts.length > 0) return parts.join(', ');
        return d.display_name || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
      }
    } catch (e) {}

    return `Coordinates: ${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  }

  /**
   * Search address / locality / pincode
   */
  static async searchAddress(address: string): Promise<{ lat: number; lon: number; display_name: string } | null> {
    try {
      const resp = await fetch(`${API_BASE}/api/geocode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address })
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.status === 'ok' && data.lat && data.lon) {
          return { lat: data.lat, lon: data.lon, display_name: data.display_name };
        }
      }
    } catch (e) {
      console.warn('[API] Search address backend failed:', e);
    }

    // Direct Nominatim fallback
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&countrycodes=in&limit=1`);
      if (r.ok) {
        const list = await r.json();
        if (list && list.length > 0) {
          return {
            lat: parseFloat(list[0].lat),
            lon: parseFloat(list[0].lon),
            display_name: list[0].display_name
          };
        }
      }
    } catch (e) {}

    return null;
  }

  /**
   * Generate Digital Emergency Dispatch Broadcast
   */
  static async broadcastDispatch(payload: {
    lat: number;
    lon: number;
    patient_name: string;
    blood_group: string;
    crash_severity: string;
    hospital_name: string;
    hospital_phone: string;
    signals: string[];
    g_force?: number;
    speed?: number;
  }): Promise<{ whatsapp_url: string; sms_payload: string; dispatch_id: string }> {
    try {
      const resp = await fetch(`${API_BASE}/api/dispatch/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (resp.ok) {
        return await resp.json();
      }
    } catch (err) {
      console.warn('[API] Broadcast API failed, building client-side link:', err);
    }

    const mapsLink = `https://www.google.com/maps/search/?api=1&query=${payload.lat},${payload.lon}`;
    const sms = `🚨 [ROADSOS EMERGENCY SOS]\nPATIENT: ${payload.patient_name} (${payload.blood_group})\nSEVERITY: ${payload.crash_severity.toUpperCase()}\nDESTINATION: ${payload.hospital_name}\nLOCATION: ${mapsLink}`;
    return {
      dispatch_id: `SOS-${Date.now()}`,
      sms_payload: sms,
      whatsapp_url: `https://api.whatsapp.com/send?text=${encodeURIComponent(sms)}`
    };
  }

  /**
   * Health Check
   */
  static async checkHealth(): Promise<SystemHealth> {
    const resp = await fetch(`${API_BASE}/api/health`);
    if (!resp.ok) throw new Error('Health check failed');
    return await resp.json();
  }
}
