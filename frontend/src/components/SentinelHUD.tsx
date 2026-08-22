import React, { useState } from 'react';
import {
  Activity, Zap, Gauge, Compass, ShieldAlert,
  Volume2, Play, RefreshCw, AlertOctagon, CheckCircle2,
  Sliders, ArrowUpRight, Flame
} from 'lucide-react';
import { KineticTelemetry } from '../types';
import { sentinelEngine } from '../services/SentinelEngine';
import { audioSiren } from '../services/audioSiren';
import { useHaptics } from '../hooks/useHaptics';

interface SentinelHUDProps {
  telemetry: KineticTelemetry;
  isActive: boolean;
}

export const SentinelHUD: React.FC<SentinelHUDProps> = ({ telemetry, isActive }) => {
  const [sensitivityPreset, setSensitivityPreset] = useState<'highway' | 'city' | 'bike'>('highway');
  const [isTestingSiren, setIsTestingSiren] = useState(false);
  const { triggerSosPattern } = useHaptics();

  // Normalize G-Force for visual dial (0 to 6.0G range)
  const clampedGForce = Math.min(6.0, Math.max(0.5, telemetry.g_force || 1.0));
  const gPercentage = (clampedGForce / 6.0) * 100;

  const isSevereG = clampedGForce >= 4.0;
  const isElevatedG = clampedGForce >= 2.5 && clampedGForce < 4.0;

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

  return (
    <div className="space-y-6">
      
      {/* Top Banner: Omniscient Autonomous Kinetic Radar */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-5 sm:p-7 relative overflow-hidden">
        
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-400 via-brand-500 to-emergency-500" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          {/* Left Title & Status */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Autonomous Kinetic Sentinel Active
              </span>
              <span className="text-xs text-slate-400 font-mono">60Hz Real-Time</span>
            </div>
            
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Vehicle Kinetic &amp; Impact Telemetry
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-xl">
              Sentinel continuously evaluates 3-axis accelerometer forces, sudden deceleration spikes, and vehicle rollover tilt angles to trigger automatic emergency rescue.
            </p>
          </div>

          {/* Right Action: Siren & Haptics Test Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleTestSiren}
              disabled={isTestingSiren}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold border transition active:scale-95 shadow-sm ${
                isTestingSiren
                  ? 'bg-emergency-600 text-white border-emergency-600 animate-pulse'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
              }`}
            >
              <Volume2 className="w-4 h-4 text-emergency-600" />
              <span>{isTestingSiren ? 'Sounding Siren...' : 'Test Siren & Haptics'}</span>
            </button>
          </div>

        </div>

        {/* Live Gauges Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          
          {/* Gauge 1: Real-time G-Force Dial */}
          <div className={`p-4 rounded-2xl border transition-all ${
            isSevereG
              ? 'bg-emergency-50/80 border-emergency-300 ring-2 ring-emergency-400'
              : isElevatedG
              ? 'bg-amber-50/80 border-amber-200'
              : 'bg-slate-50 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
              <span className="flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-brand-600" />
                Kinetic G-Force
              </span>
              <span className={`font-mono text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                isSevereG ? 'bg-emergency-200 text-emergency-800' : 'bg-slate-200 text-slate-700'
              }`}>
                {isSevereG ? 'IMPACT' : 'NOMINAL'}
              </span>
            </div>
            
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-3xl sm:text-4xl font-black text-slate-900 font-mono tracking-tight">
                {telemetry.g_force ? telemetry.g_force.toFixed(2) : '1.00'}
              </span>
              <span className="text-sm font-bold text-slate-500 font-mono">G</span>
            </div>

            {/* Progress Bar Gauge */}
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-3">
              <div
                className={`h-full rounded-full transition-all duration-150 ${
                  isSevereG
                    ? 'bg-emergency-600'
                    : isElevatedG
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${gPercentage}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
              <span>0G</span>
              <span className="text-emergency-600 font-bold">4.5G (Crash Threshold)</span>
              <span>6G</span>
            </div>
          </div>

          {/* Gauge 2: Vehicle Velocity */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
              <span className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-brand-600" />
                Current Speed
              </span>
              <span className="font-mono text-[10px] text-slate-400">GPS Stream</span>
            </div>
            
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-3xl sm:text-4xl font-black text-slate-900 font-mono tracking-tight">
                {telemetry.speed_kmh || 0}
              </span>
              <span className="text-sm font-bold text-slate-500 font-mono">km/h</span>
            </div>

            <div className="text-[11px] text-slate-500 font-medium mt-3 flex items-center gap-1">
              <span>Deceleration Delta:</span>
              <strong className="font-mono text-slate-800">{telemetry.delta_speed_kmh || 0} km/h</strong>
            </div>
          </div>

          {/* Gauge 3: Rollover Tilt Angle */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
              <span className="flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-brand-600" />
                Rollover Angle
              </span>
              <span className="font-mono text-[10px] text-slate-400">Gyro Sensor</span>
            </div>
            
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-3xl sm:text-4xl font-black text-slate-900 font-mono tracking-tight">
                {telemetry.tilt_angle_deg || 0}
              </span>
              <span className="text-sm font-bold text-slate-500 font-mono">°</span>
            </div>

            <div className="text-[11px] text-slate-500 font-medium mt-3">
              <span>Rollover Trigger: </span>
              <strong className="text-amber-700 font-mono">&gt;65° Tilt</strong>
            </div>
          </div>

          {/* Gauge 4: 3-Axis Vector [X, Y, Z] */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-brand-600" />
                3-Axis Accelerometer
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
                <span className="text-xs font-bold text-slate-800">{telemetry.accel_z || 9.8}</span>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 mt-2 text-center">
              Tri-axial physical shock vector
            </p>
          </div>

        </div>

      </div>

      {/* Kinetic Crash Simulation Studio (Interactive Demonstration Buttons) */}
      <div className="bg-gradient-to-br from-slate-50 to-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
              <Flame className="w-4 h-4 text-emergency-600" />
              Kinetic Crash Simulation Studio
            </h3>
            <p className="text-xs text-slate-500">
              Click any scenario to simulate a severe kinetic anomaly and test the 30-second emergency dispatch countdown.
            </p>
          </div>
          <span className="text-[11px] font-bold text-brand-600 uppercase tracking-wider px-2.5 py-1 rounded-full bg-brand-50 border border-brand-200 self-start sm:self-auto">
            Live Testing Studio
          </span>
        </div>

        {/* 4 Interactive Simulation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Simulation 1: High-G Collision Impact */}
          <button
            onClick={() => sentinelEngine.simulateImpact(5.8)}
            className="group text-left p-4 rounded-2xl bg-white hover:bg-emergency-50/50 border border-slate-200 hover:border-emergency-300 shadow-sm hover:shadow-md transition-all duration-200 active:scale-95 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="w-8 h-8 rounded-xl bg-emergency-100 text-emergency-700 flex items-center justify-center font-bold text-xs group-hover:scale-110 transition">
                💥
              </span>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-emergency-600 transition" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900 group-hover:text-emergency-700 transition">
                High-Speed Collision
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Simulates a <strong>5.8G</strong> vehicle impact force.
              </p>
            </div>
          </button>

          {/* Simulation 2: Sudden Deceleration Stop */}
          <button
            onClick={() => sentinelEngine.simulateSuddenStop()}
            className="group text-left p-4 rounded-2xl bg-white hover:bg-amber-50/50 border border-slate-200 hover:border-amber-300 shadow-sm hover:shadow-md transition-all duration-200 active:scale-95 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs group-hover:scale-110 transition">
                🛑
              </span>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900 group-hover:text-amber-700 transition">
                Sudden Deceleration
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Simulates a <strong>65 → 0 km/h</strong> hard crash stop.
              </p>
            </div>
          </button>

          {/* Simulation 3: Vehicle Rollover */}
          <button
            onClick={() => sentinelEngine.simulateRollover()}
            className="group text-left p-4 rounded-2xl bg-white hover:bg-purple-50/50 border border-slate-200 hover:border-purple-300 shadow-sm hover:shadow-md transition-all duration-200 active:scale-95 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs group-hover:scale-110 transition">
                🔄
              </span>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900 group-hover:text-purple-700 transition">
                Vehicle Rollover
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Simulates a <strong>92°</strong> tilt angle vehicle inversion.
              </p>
            </div>
          </button>

          {/* Simulation 4: Dead-Man Fall Switch */}
          <button
            onClick={() => sentinelEngine.simulateImpact(4.6)}
            className="group text-left p-4 rounded-2xl bg-white hover:bg-medical-teal/10 border border-slate-200 hover:border-medical-teal shadow-sm hover:shadow-md transition-all duration-200 active:scale-95 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="w-8 h-8 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs group-hover:scale-110 transition">
                🚨
              </span>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-teal-700 transition" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900 group-hover:text-teal-800 transition">
                Unresponsive Impact
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Simulates <strong>4.6G</strong> shock with unconscious driver.
              </p>
            </div>
          </button>

        </div>

      </div>

    </div>
  );
};
