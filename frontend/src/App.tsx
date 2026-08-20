import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, AlertTriangle, Radio, Navigation, CheckCircle2,
  RefreshCw, MapPin, Phone, Share2, Award, HeartHandshake,
  Activity, Zap, Search, Clock
} from 'lucide-react';
import { Header } from './components/Header';
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
  
  // Geolocation
  const [lat, setLat] = useState<number>(17.3850);
  const [lon, setLon] = useState<number>(78.4867);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);

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

  // 1. Initialize High-Accuracy GPS on Mount
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude);
          setLon(pos.coords.longitude);
          setGpsAccuracy(pos.coords.accuracy);
        },
        (err) => console.warn('[GPS] Initial positioning warning:', err.message),
        { enableHighAccuracy: true, timeout: 8000 }
      );

      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setLat(pos.coords.latitude);
          setLon(pos.coords.longitude);
          setGpsAccuracy(pos.coords.accuracy);
        },
        (err) => console.warn('[GPS] Watch warning:', err.message),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

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

  // 3. Trigger Emergency Triage Flow
  const executeEmergencyTriage = async (
    signals: string[],
    vehicleAvailable: boolean = true,
    telemetryData?: KineticTelemetry,
    notes: string = ''
  ) => {
    setIsLoading(true);
    setState('ANALYZING');
    setActiveSignals(signals);

    try {
      const response = await ApiService.requestEmergencyGuidance({
        lat,
        lon,
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
      `Autonomous Crash Trigger: ${alert.type} (${alert.telemetry.g_force.toFixed(2)}G)`
    );
  };

  // 5. Reset Emergency State
  const handleReset = () => {
    setState('IDLE');
    setEmergencyResponse(null);
    setSelectedHospital(null);
    setActiveSignals([]);
  };

  return (
    <div className="min-h-screen bg-obsidian-bg text-slate-100 flex flex-col font-sans antialiased selection:bg-primary selection:text-white">
      
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
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        
        {/* State 1: IDLE / MONITORING STATE */}
        {state === 'IDLE' && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* Autonomous Sentinel Telemetry HUD (Rendered when in Automatic Mode) */}
            {mode === 'AUTOMATIC' && (
              <SentinelHUD
                telemetry={telemetry}
                isActive={true}
              />
            )}

            {/* Manual Triage Section */}
            <ManualSOS
              onTriggerSOS={(signals, vehicle, notes) => executeEmergencyTriage(signals, vehicle, undefined, notes)}
              isLoading={isLoading}
            />

          </div>
        )}

        {/* State 2: ANALYZING STATE */}
        {state === 'ANALYZING' && (
          <div className="flex flex-col items-center justify-center py-24 space-y-6 animate-fadeIn">
            <div className="relative flex items-center justify-center w-24 h-24">
              <div className="absolute inset-0 rounded-full bg-primary/30 animate-pulse-ring"></div>
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white shadow-glow-primary">
                <Activity className="w-8 h-8 animate-spin" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-black text-white">
                Executing Spatial &amp; Clinical Triage...
              </h2>
              <p className="text-sm text-slate-400 max-w-md">
                Querying 30,000+ national hospitals via BallTree and evaluating Trauma/ICU capabilities for your exact coordinates.
              </p>
            </div>
          </div>
        )}

        {/* State 3: ACTIVE EMERGENCY GUIDANCE DASHBOARD */}
        {state === 'ACTIVE' && emergencyResponse && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* Active Emergency Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-primary/30 via-slate-900 to-slate-900 border border-primary/50 shadow-glow-primary">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 shadow-lg">
                  <Shield className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold uppercase px-2 py-0.5 rounded-md bg-primary text-white">
                      ACTIVE RESCUE DISPATCH
                    </span>
                    <span className="text-xs text-slate-400">
                      Latency: {emergencyResponse.metadata?.latency_ms || 3.2}ms
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-black text-white mt-1">
                    {emergencyResponse.plan.recommended_hospital}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleReset}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 active:scale-95 transition"
                >
                  Reset / New Emergency
                </button>
              </div>
            </div>

            {/* Split Grid: Left = AI Copilot & Hospitals, Right = Live Route Map */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column (7 Cols): AI Triage & Hospital Ranking */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* AI Triage Copilot */}
                <AITriageCopilot
                  plan={emergencyResponse.plan}
                  weather={emergencyResponse.weather}
                  signals={activeSignals}
                />

                {/* Hospital Recommendations List */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                      <Award className="w-4 h-4 text-primary-light" />
                      Clinically Ranked Emergency Facilities ({emergencyResponse.hospitals.length})
                    </h3>
                  </div>

                  <div className="space-y-4">
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
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-cyan-400" />
                    Live Emergency Navigation Radar
                  </h3>
                  <EmergencyMap
                    userLat={lat}
                    userLon={lon}
                    hospitals={emergencyResponse.hospitals}
                    selectedHospital={selectedHospital || undefined}
                    onSelectHospital={(h) => setSelectedHospital(h)}
                  />
                </div>

                {/* Weather & Road Condition Widget */}
                {emergencyResponse.weather && (
                  <div className="bg-obsidian-surface rounded-2xl border border-obsidian-border p-4 shadow-xl text-xs space-y-2">
                    <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px] block">
                      En Route Atmospheric &amp; Road Hazards
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-slate-300">
                      <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                        <span className="text-slate-500 text-[10px] block">Weather</span>
                        <strong className="text-white">{emergencyResponse.weather.condition} ({emergencyResponse.weather.temperature_c}°C)</strong>
                      </div>
                      <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                        <span className="text-slate-500 text-[10px] block">Road Surface</span>
                        <strong className="text-emerald-400">{emergencyResponse.weather.road_condition}</strong>
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
