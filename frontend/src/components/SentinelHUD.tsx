import React, { useState, useEffect } from 'react';
import {
  Activity, Zap, Gauge, Compass, ShieldAlert,
  Volume2, Play, RefreshCw, AlertOctagon, CheckCircle2,
  Sliders, ArrowUpRight, Flame, Smartphone, SlidersHorizontal,
  Bike, Car, Truck, Sparkles, Navigation, RotateCcw
} from 'lucide-react';
import { KineticTelemetry } from '../types';
import { sentinelEngine, VehicleProfile, SENSITIVITY_PROFILES } from '../services/SentinelEngine';
import { audioSiren } from '../services/audioSiren';
import { useHaptics } from '../hooks/useHaptics';

interface SentinelHUDProps {
  telemetry: KineticTelemetry;
  isActive: boolean;
}

export const SentinelHUD: React.FC<SentinelHUDProps> = ({ telemetry, isActive }) => {
  const [isTestingSiren, setIsTestingSiren] = useState(false);
  const [sliderGForce, setSliderGForce] = useState(telemetry.g_force || 1.0);
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  const [isSimulatingSpeed, setIsSimulatingSpeed] = useState(false);
  const [activeProfile, setActiveProfile] = useState<VehicleProfile>(sentinelEngine.getVehicleProfile());
  const { triggerSosPattern } = useHaptics();

  const thresholds = SENSITIVITY_PROFILES[activeProfile];

  // Normalize G-Force for visual dial (0.5 to 6.0G range)
  const clampedGForce = Math.min(6.0, Math.max(0.5, telemetry.g_force || 1.0));
  const gPercentage = ((clampedGForce - 0.5) / 5.5) * 100;

  const isSevereG = clampedGForce >= thresholds.impactG;
  const isElevatedG = clampedGForce >= (thresholds.impactG * 0.65) && clampedGForce < thresholds.impactG;

  const handleTestSiren = () => {
    if (isTestingSiren) return;
    setIsTestingSiren(true);
    audioSiren.start();
    triggerSosPattern();
    setTimeout(() => {
      audioSiren.stop();
      setIsTestingSiren(false);
    }, 2500);
  };

  const handleCalibrateSensors = async () => {
    const granted = await sentinelEngine.requestMotionPermission();
    setIsPermissionGranted(granted);
    sentinelEngine.calibrateSensors();
  };

  const handleProfileChange = (p: VehicleProfile) => {
    setActiveProfile(p);
    sentinelEngine.setVehicleProfile(p);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setSliderGForce(val);
    sentinelEngine.setManualGForce(val);
  };

  const handleSetSpeed = (kmh: number) => {
    setIsSimulatingSpeed(true);
    sentinelEngine.setSimulatedSpeed(kmh);
  };

  const handleStopSpeed = () => {
    setIsSimulatingSpeed(false);
    sentinelEngine.stopSpeedSimulation();
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner: Omniscient Autonomous Kinetic Radar */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-5 sm:p-7 relative overflow-hidden">
        
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-400 via-brand-500 to-emergency-500" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          {/* Left Title & Status */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Autonomous Kinetic Sentinel Active
              </span>
              <span className="text-xs text-slate-400 font-mono">60Hz Linear IMU Filter</span>
              <span className="text-xs font-bold text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-md border border-brand-200">
                Crash Threshold: {thresholds.impactG}G
              </span>
            </div>
            
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Vehicle Kinetic &amp; Accelerometer Monitor
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-xl">
              Sentinel isolates linear dynamic acceleration from baseline Earth gravity (alpha=0.88), tracks GPS velocity, and relative rollover deviation to detect real collisions.
            </p>
          </div>

          {/* Right Actions: Sensor Permissions, Calibration & Siren Test */}
          <div className="flex flex-wrap items-center gap-2">
            
            <button
              onClick={handleCalibrateSensors}
              className="px-3.5 py-2.5 rounded-2xl bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-bold transition flex items-center gap-1.5 border border-brand-200"
            >
              <RotateCcw className="w-3.5 h-3.5 text-brand-600" />
              <span>Calibrate Baseline Sensors</span>
            </button>

            <button
              onClick={handleTestSiren}
              disabled={isTestingSiren}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 shadow-sm active:scale-95 ${
                isTestingSiren
                  ? 'bg-emergency-600 text-white animate-pulse'
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              <Volume2 className={`w-4 h-4 ${isTestingSiren ? 'animate-bounce text-amber-300' : ''}`} />
              <span>{isTestingSiren ? 'Siren Pulsing...' : 'Test Siren & Haptics'}</span>
            </button>

          </div>

        </div>

        {/* Vehicle Sensitivity Profile Selector */}
        <div className="mt-5 p-3 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Sliders className="w-4 h-4 text-brand-600" />
            <span>Vehicle Crash Sensitivity Profile:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleProfileChange('BIKE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                activeProfile === 'BIKE'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Bike className="w-3.5 h-3.5" />
              <span>2-Wheeler (3.8G)</span>
            </button>

            <button
              type="button"
              onClick={() => handleProfileChange('CAR')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                activeProfile === 'CAR'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              <span>Car / Sedan (4.2G)</span>
            </button>

            <button
              type="button"
              onClick={() => handleProfileChange('TRUCK')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                activeProfile === 'TRUCK'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Heavy Commercial (5.0G)</span>
            </button>

            <button
              type="button"
              onClick={() => handleProfileChange('TEST')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                activeProfile === 'TEST'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Demo Test (3.0G)</span>
            </button>
          </div>
        </div>

        {/* 4 Live Kinetic Metric Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          
          {/* Gauge 1: G-Force Magnitude */}
          <div className={`p-4 rounded-2xl border transition-all duration-300 ${
            isSevereG
              ? 'bg-emergency-50/80 border-emergency-300 shadow-md ring-2 ring-emergency-400/30'
              : isElevatedG
              ? 'bg-amber-50/70 border-amber-300'
              : 'bg-slate-50 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
              <span className="flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-brand-600" />
                Physical G-Force
              </span>
              <span className="font-mono text-[10px] text-slate-400">Magnitude</span>
            </div>

            <div className="flex items-baseline gap-1 mt-2">
              <span className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
                isSevereG ? 'text-emergency-700' : isElevatedG ? 'text-amber-700' : 'text-slate-900'
              }`}>
                {(telemetry.g_force || 1.0).toFixed(2)}
              </span>
              <span className="text-xs font-bold text-slate-400">G</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-200 rounded-full h-1.5 mt-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-150 ${
                  isSevereG ? 'bg-emergency-600' : isElevatedG ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(8, gPercentage))}%` }}
              />
            </div>

            <p className="text-[10px] text-slate-400 mt-2">
              {clampedGForce <= 1.3 ? 'Normal 1.00G Resting Force' : isSevereG ? `🚨 Crash Threshold Exceeded (>${thresholds.impactG}G)` : 'Dynamic Motion Detected'}
            </p>
          </div>

          {/* Gauge 2: Vehicle Velocity */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
              <span className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-brand-600" />
                GPS Vehicle Speed
              </span>
              <span className="font-mono text-[10px] text-slate-400">km/h</span>
            </div>

            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 tracking-tight">
                {telemetry.speed_kmh || 0}
              </span>
              <span className="text-xs font-bold text-slate-400">km/h</span>
            </div>

            <div className="w-full bg-slate-200 rounded-full h-1.5 mt-3 overflow-hidden">
              <div
                className="h-full bg-brand-600 rounded-full transition-all duration-200"
                style={{ width: `${Math.min(100, ((telemetry.speed_kmh || 0) / 120) * 100)}%` }}
              />
            </div>

            <p className="text-[10px] text-slate-400 mt-2">
              {isSimulatingSpeed ? '🧪 Simulated Driving Speed' : `Live Satellite Speed (${telemetry.delta_speed_kmh || 0} km/h drop)`}
            </p>
          </div>

          {/* Gauge 3: Rollover Tilt Angle */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
              <span className="flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-brand-600" />
                Relative Tilt Angle
              </span>
              <span className="font-mono text-[10px] text-slate-400">Deviation</span>
            </div>

            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 tracking-tight">
                {telemetry.tilt_angle_deg || 0}°
              </span>
              <span className="text-xs font-bold text-slate-400">deg</span>
            </div>

            <div className="w-full bg-slate-200 rounded-full h-1.5 mt-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-200 ${
                  (telemetry.tilt_angle_deg || 0) >= thresholds.tiltAngleDeg ? 'bg-emergency-600' : 'bg-brand-600'
                }`}
                style={{ width: `${Math.min(100, ((telemetry.tilt_angle_deg || 0) / 90) * 100)}%` }}
              />
            </div>

            <p className="text-[10px] text-slate-400 mt-2">
              {(telemetry.tilt_angle_deg || 0) >= thresholds.tiltAngleDeg ? '🚨 Rollover Threshold Exceeded' : `Calibrated Resting Pitch/Roll (<${thresholds.tiltAngleDeg}°)`}
            </p>
          </div>

          {/* Gauge 4: 3-Axis Vector [X, Y, Z] */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-brand-600" />
                Linear Dynamic Vector
              </span>
              <span className="font-mono text-[10px] text-slate-400">m/s²</span>
            </div>
            
            <div className="grid grid-cols-3 gap-2 mt-3 text-center font-mono">
              <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-sans">Ax</span>
                <span className="text-xs font-bold text-slate-800">{telemetry.accel_x || 0}</span>
              </div>
              <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-sans">Ay</span>
                <span className="text-xs font-bold text-slate-800">{telemetry.accel_y || 0}</span>
              </div>
              <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-sans">Az</span>
                <span className="text-xs font-bold text-slate-800">{telemetry.accel_z || 0}</span>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 mt-2">
              Earth gravity isolated (0.0 m/s² dynamic baseline)
            </p>
          </div>

        </div>

        {/* Live Driving Speed Simulator Studio */}
        <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Navigation className="w-4 h-4 text-brand-600" />
              <span className="text-xs font-bold text-slate-800">Vehicle Driving Speed Simulator (Test Velocity &amp; Sudden Braking):</span>
            </div>
            {isSimulatingSpeed && (
              <button
                onClick={handleStopSpeed}
                className="text-[11px] font-bold text-emergency-600 hover:underline"
              >
                Reset to GPS
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleSetSpeed(45)}
              className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition"
            >
              🚗 City Drive (45 km/h)
            </button>
            <button
              type="button"
              onClick={() => handleSetSpeed(80)}
              className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition"
            >
              🛣️ Highway (80 km/h)
            </button>
            <button
              type="button"
              onClick={() => handleSetSpeed(110)}
              className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition"
            >
              🏎️ Express (110 km/h)
            </button>
            <button
              type="button"
              onClick={() => sentinelEngine.simulateSuddenStop()}
              className="px-3.5 py-1.5 rounded-xl bg-emergency-50 hover:bg-emergency-100 border border-emergency-200 text-xs font-bold text-emergency-700 transition"
            >
              🚨 Sudden Crash Deceleration (80 → 0 km/h)
            </button>
          </div>
        </div>

        {/* Manual Kinetic Throttle Slider for Precise Calibration Testing */}
        <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-brand-600" />
              <span>Manual Kinetic Force Throttle Slider:</span>
            </div>
            <span className="font-mono text-brand-700 text-sm">{sliderGForce.toFixed(2)}G</span>
          </div>

          <input
            type="range"
            min="1.0"
            max="6.0"
            step="0.05"
            value={sliderGForce}
            onChange={handleSliderChange}
            className="w-full accent-brand-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
          />

          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
            <span>1.00G (Rest)</span>
            <span>2.50G (Harsh Bump)</span>
            <span className="text-amber-600 font-bold">{thresholds.impactG}G (Threshold)</span>
            <span className="text-emergency-600 font-bold">6.00G (Severe Impact)</span>
          </div>
        </div>

        {/* 1-Click Crash Scenario Triggers */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
            Autonomous Crash Simulation Scenarios (Instant Rescue Verification):
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            
            <button
              onClick={() => sentinelEngine.simulateImpact(5.82)}
              className="px-4 py-3 rounded-2xl bg-white hover:bg-emergency-50 text-slate-800 hover:text-emergency-700 border border-slate-200 hover:border-emergency-300 text-xs font-bold transition flex items-center justify-center gap-2 group shadow-xs active:scale-95"
            >
              <Flame className="w-4 h-4 text-emergency-500 group-hover:scale-110 transition-transform" />
              <span>High-Velocity Impact (5.82G)</span>
            </button>

            <button
              onClick={() => sentinelEngine.simulateSuddenStop()}
              className="px-4 py-3 rounded-2xl bg-white hover:bg-amber-50 text-slate-800 hover:text-amber-700 border border-slate-200 hover:border-amber-300 text-xs font-bold transition flex items-center justify-center gap-2 group shadow-xs active:scale-95"
            >
              <AlertOctagon className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
              <span>Sudden Deceleration Drop</span>
            </button>

            <button
              onClick={() => sentinelEngine.simulateRollover()}
              className="px-4 py-3 rounded-2xl bg-white hover:bg-purple-50 text-slate-800 hover:text-purple-700 border border-slate-200 hover:border-purple-300 text-xs font-bold transition flex items-center justify-center gap-2 group shadow-xs active:scale-95"
            >
              <Compass className="w-4 h-4 text-purple-500 group-hover:scale-110 transition-transform" />
              <span>Vehicle Rollover (92° Tilt)</span>
            </button>

          </div>
        </div>

      </div>

    </div>
  );
};
