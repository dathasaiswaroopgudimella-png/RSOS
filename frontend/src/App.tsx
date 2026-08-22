import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert, AlertTriangle, Radio, Navigation, CheckCircle2,
  RefreshCw, MapPin, Phone, Share2, Award, HeartHandshake,
  Activity, Zap, Search, Clock, ArrowLeft, Layers
} from 'lucide-react';
import { Header } from './components/Header';
import { LocationSelectorBar } from './components/LocationSelectorBar';
import { SentinelHUD } from './components/SentinelHUD';
import { SentinelOverlay } from './components/SentinelOverlay';
import { ManualSOS } from './components/ManualSOS';
import { HospitalCard } from './components/HospitalCard';
import { EmergencyMap } from './components/EmergencyMap';
import { AITriageCopilot } from './components/AITriageCopilot';
import { EmergencyContactsModal } from './components/EmergencyContactsModal';
import { SystemDiagnostics } from './components/SystemDiagnostics';
import { sentinelEngine } from './services/SentinelEngine';
import { ApiService, FALLBACK_HOSPITALS } from './services/api';
import {
  AppMode, EmergencyState, Hospital, KineticTelemetry,
  SentinelAlert, EmergencyResponse
} from './types';

export default function App() {
  // Mode & Emergency Lifecycle State
  const [mode, setMode] = useState<AppMode>('AUTOMATIC');
  const [state, setState] = useState<EmergencyState>('IDLE');
  
  // Geolocation & Address (Default: Hyderabad Jubilee Hills)
  const [lat, setLat] = useState<number>(17.4319);
  const [lon, setLon] = useState<number>(78.4073);
  const [addressName, setAddressName] = useState<string>('Jubilee Hills, Hyderabad, Telangana');
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [isGpsLocating, setIsGpsLocating] = useState<boolean>(false);

  // Sentinel Engine & Kinetic Telemetry
  const [telemetry, setTelemetry] = useState<KineticTelemetry>(sentinelEngine.getTelemetry());
  const [sentinelAlert, setSentinelAlert] = useState<SentinelAlert | null>(null);

  // Emergency Triage Results
  const [activeSignals, setActiveSignals] = useState<string[]>([]);
  const [emergencyResponse, setEmergencyResponse] = useState<EmergencyResponse | null>(null);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Modals
  const [isContactsOpen, setIsContactsOpen] = useState<boolean>(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState<boolean>(false);

  // 1. Resolve initial location via Browser GPS / IP Geolocation
  const resolveLocation = useCallback(async () => {
    setIsGpsLocating(true);
    
    // First try browser GPS
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const userLat = pos.coords.latitude;
          const userLon = pos.coords.longitude;
          setLat(userLat);
          setLon(userLon);
          setGpsAccuracy(pos.coords.accuracy);
          setIsGpsLocating(false);

          const humanName = await ApiService.reverseGeocode(userLat, userLon);
          setAddressName(humanName);
        },
        async (err) => {
          console.warn('[GPS] Browser GPS denied/timeout, attempting IP location:', err.message);
          const ipLoc = await ApiService.getIpLocation();
          if (ipLoc) {
            setLat(ipLoc.lat);
            setLon(ipLoc.lon);
            setAddressName(ipLoc.display_name);
          }
          setIsGpsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      const ipLoc = await ApiService.getIpLocation();
      if (ipLoc) {
        setLat(ipLoc.lat);
        setLon(ipLoc.lon);
        setAddressName(ipLoc.display_name);
      }
      setIsGpsLocating(false);
    }
  }, []);

  useEffect(() => {
    resolveLocation();
  }, [resolveLocation]);

  // 2. Manage Sentinel Engine in Automatic Mode
  useEffect(() => {
    if (mode === 'AUTOMATIC' && state !== 'ACTIVE') {
      sentinelEngine.activate(
        (alert) => {
          console.warn('[SENTINEL] Kinetic Anomaly detected:', alert);
          setSentinelAlert(alert);
        },
        (tele) => {
          setTelemetry(tele);
        }
      );
    } else {
      sentinelEngine.deactivate();
    }

    return () => {
      sentinelEngine.deactivate();
    };
  }, [mode, state]);

  // 3. Trigger Emergency Triage Flow with explicit lat/lon overrides
  const executeEmergencyTriage = async (
    signals: string[],
    vehicleAvailable: boolean = true,
    telemetryData?: KineticTelemetry,
    notes: string = '',
    overrideLat?: number,
    overrideLon?: number
  ) => {
    setIsLoading(true);
    setState('ANALYZING');
    setActiveSignals(signals);

    const targetLat = overrideLat !== undefined ? overrideLat : lat;
    const targetLon = overrideLon !== undefined ? overrideLon : lon;

    try {
      const response = await ApiService.requestEmergencyGuidance({
        lat: targetLat,
        lon: targetLon,
        signals,
        vehicleAvailable,
        telemetry: telemetryData || telemetry,
        notes,
      });

      setEmergencyResponse(response);
      if (response.hospitals && response.hospitals.length > 0) {
        setSelectedHospital(response.hospitals[0]);
      }
      setState('ACTIVE');
    } catch (e) {
      console.error('[TRIAGE] Execution failed:', e);
      setState('ACTIVE');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Sentinel Confirm Handler (Countdown expired or user pressed Broadcast SOS)
  const handleSentinelConfirm = (alert: SentinelAlert) => {
    setSentinelAlert(null);
    executeEmergencyTriage(
      ['automatic_crash_detection', alert.type],
      true,
      alert.telemetry,
      `Autonomous Sentinel Trigger: ${alert.type} (${alert.telemetry.g_force.toFixed(2)}G)`,
      lat,
      lon
    );
  };

  // 5. User selected manual location, searched address, or clicked on map
  const handleLocationChange = async (newLat: number, newLon: number, name?: string) => {
    setLat(newLat);
    setLon(newLon);

    if (name) {
      setAddressName(name);
    } else {
      const human = await ApiService.reverseGeocode(newLat, newLon);
      setAddressName(human);
    }

    // If currently viewing active emergency, re-rank hospitals for the new location immediately!
    if (state === 'ACTIVE') {
      executeEmergencyTriage(activeSignals, true, telemetry, '', newLat, newLon);
    }
  };

  // 6. Reset Emergency State
  const handleReset = () => {
    setState('IDLE');
    setEmergencyResponse(null);
    setSelectedHospital(null);
    setActiveSignals([]);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased selection:bg-brand-500 selection:text-white">
      
      {/* Top Application Header */}
      <Header
        mode={mode}
        onToggleMode={(newMode) => setMode(newMode)}
        gpsAccuracy={gpsAccuracy}
        sensorActive={mode === 'AUTOMATIC'}
        onOpenContacts={() => setIsContactsOpen(true)}
        onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
      />

      {/* Main Screen Canvas */}
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Global Incident Location & Search Bar */}
        <LocationSelectorBar
          currentAddress={addressName}
          lat={lat}
          lon={lon}
          gpsAccuracy={gpsAccuracy}
          onLocationSelect={handleLocationChange}
          onRefreshGps={resolveLocation}
          isGpsLocating={isGpsLocating}
        />

        {/* State 1: IDLE / MONITORING STATE */}
        {state === 'IDLE' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Autonomous Sentinel Telemetry HUD (Rendered when in Automatic Mode) */}
            {mode === 'AUTOMATIC' && (
              <SentinelHUD
                telemetry={telemetry}
                isActive={true}
              />
            )}

            {/* Manual Triage Section */}
            <ManualSOS
              onTriggerSOS={(signals, vehicle, notes) => executeEmergencyTriage(signals, vehicle, undefined, notes, lat, lon)}
              isLoading={isLoading}
            />

          </div>
        )}

        {/* State 2: ANALYZING STATE */}
        {state === 'ANALYZING' && (
          <div className="flex flex-col items-center justify-center py-24 space-y-6 animate-fadeIn bg-white rounded-3xl border border-slate-200 shadow-sm">
            <div className="relative flex items-center justify-center w-24 h-24">
              <div className="absolute inset-0 rounded-full bg-emergency-500/20 animate-pulse-ring"></div>
              <div className="w-16 h-16 rounded-full bg-emergency-600 flex items-center justify-center text-white shadow-lg shadow-emergency-600/30">
                <Activity className="w-8 h-8 animate-spin" />
              </div>
            </div>
            <div className="text-center space-y-2 max-w-md px-4">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                Evaluating 30,273+ National Hospitals...
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Querying spatial BallTree index in sub-5ms and computing Clinical Suitability Scores based on verified Trauma, ICU, and Blood Bank capabilities.
              </p>
            </div>
          </div>
        )}

        {/* State 3: ACTIVE EMERGENCY GUIDANCE DASHBOARD */}
        {state === 'ACTIVE' && emergencyResponse && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Active Emergency Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-white border border-emergency-200 shadow-card">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emergency-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emergency-600/20">
                  <ShieldAlert className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emergency-100 text-emergency-800">
                      Active Rescue Dispatch
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      Spatial Latency: {emergencyResponse.metadata?.latency_ms || 2.8}ms
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
                    {emergencyResponse.plan.recommended_hospital}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleReset}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-200 active:scale-95 transition flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Reset / New Emergency</span>
                </button>
              </div>
            </div>

            {/* Split Grid: Left = AI Copilot & Hospitals, Right = Live Route Map */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column (7 Cols): AI Triage & Hospital Ranking */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* AI Triage Copilot */}
                <AITriageCopilot
                  plan={emergencyResponse.plan}
                  weather={emergencyResponse.weather}
                  signals={activeSignals}
                />

                {/* Hospital Recommendations List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                      <Award className="w-4 h-4 text-brand-600" />
                      Clinically Ranked Emergency Facilities ({emergencyResponse.hospitals.length})
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {emergencyResponse.hospitals.map((hospital, index) => (
                      <HospitalCard
                        key={hospital.sr_no || index}
                        hospital={hospital}
                        isTopChoice={index === 0}
                        onSelect={() => setSelectedHospital(hospital)}
                        userLat={lat}
                        userLon={lon}
                      />
                    ))}
                  </div>
                </div>

              </div>

              {/* Right Column (5 Cols): Interactive Map & Transit Guidance */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Interactive Map */}
                <div className="space-y-2">
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-brand-600" />
                    Interactive Emergency Radar
                  </h3>
                  <EmergencyMap
                    userLat={lat}
                    userLon={lon}
                    hospitals={emergencyResponse.hospitals}
                    selectedHospital={selectedHospital || undefined}
                    onSelectHospital={(h) => setSelectedHospital(h)}
                    onMapClick={(clickedLat, clickedLon) => handleLocationChange(clickedLat, clickedLon)}
                  />
                </div>

                {/* Weather & Road Condition Card */}
                {emergencyResponse.weather && (
                  <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm text-xs space-y-2">
                    <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block">
                      En Route Atmospheric &amp; Road Hazards
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-slate-700">
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <span className="text-slate-400 text-[10px] block">Weather</span>
                        <strong className="text-slate-900">{emergencyResponse.weather.condition} ({emergencyResponse.weather.temperature_c}°C)</strong>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <span className="text-slate-400 text-[10px] block">Road Surface</span>
                        <strong className="text-emerald-700">{emergencyResponse.weather.road_condition}</strong>
                      </div>
                    </div>
                  </div>
                )}

              </div>

            </div>

          </div>
        )}

      </main>

      {/* Full-Screen Sentinel 30s Countdown Emergency Overlay */}
      <SentinelOverlay
        alert={sentinelAlert}
        onCancel={() => setSentinelAlert(null)}
        onConfirmSos={handleSentinelConfirm}
      />

      {/* Emergency Contacts & Medical ID Vault Modal */}
      <EmergencyContactsModal
        isOpen={isContactsOpen}
        onClose={() => setIsContactsOpen(false)}
        userLat={lat}
        userLon={lon}
      />

      {/* System Diagnostics & Database Inspector Modal */}
      <SystemDiagnostics
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
      />

    </div>
  );
}
