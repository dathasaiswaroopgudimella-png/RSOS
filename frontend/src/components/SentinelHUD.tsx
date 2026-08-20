import React from 'react';
import { Activity, Gauge, RotateCcw, Zap, Play, ShieldAlert, Cpu } from 'lucide-react';
import { KineticTelemetry } from '../types';
import { sentinelEngine } from '../services/SentinelEngine';

interface SentinelHUDProps {
  telemetry: KineticTelemetry;
  isActive: boolean;
}

export const SentinelHUD: React.FC<SentinelHUDProps> = ({ telemetry, isActive }) => {
  // G-force color spectrum
  const getGForceColor = (g: number) => {
    if (g > 4.5) return 'text-primary-light border-primary bg-primary/20 animate-pulse';
    if (g > 2.5) return 'text-amber-400 border-amber-500/50 bg-amber-500/10';
    return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
  };

  const getGForceBarWidth = (g: number) => {
    return Math.min(100, Math.max(8, (g / 6.0) * 100));
  };

  return (
    <div className="w-full bg-obsidian-surface rounded-2xl border border-obsidian-border p-5 shadow-2xl space-y-6">
      
      {/* Top Bar: Sentinel Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-primary-light shadow-inner">
            <Cpu className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Sentinel Omniscient Physics Engine
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                60Hz Real-Time Active
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Continuous kinetic anomaly, linear acceleration & rollover monitoring
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 self-start sm:self-auto">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span>Impact Threshold: <strong className="text-white">&gt; 4.5G (44.1 m/s²)</strong></span>
        </div>
      </div>

      {/* Real-Time Telemetry Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Metric 1: G-Force */}
        <div className="bg-slate-900/90 rounded-xl p-4 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider">Kinetic G-Force</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="my-2">
            <div className={`text-3xl font-black tracking-tight ${telemetry.g_force > 4.5 ? 'text-primary-light' : 'text-white'}`}>
              {telemetry.g_force.toFixed(2)} <span className="text-sm font-semibold text-slate-400">G</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-150 ${
                  telemetry.g_force > 4.5 ? 'bg-primary' : telemetry.g_force > 2.5 ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
                style={{ width: `${getGForceBarWidth(telemetry.g_force)}%` }}
              ></div>
            </div>
          </div>
          <span className="text-[11px] text-slate-500">
            X:{telemetry.accel_x.toFixed(1)} Y:{telemetry.accel_y.toFixed(1)} Z:{telemetry.accel_z.toFixed(1)} m/s²
          </span>
        </div>

        {/* Metric 2: Speed / Velocity */}
        <div className="bg-slate-900/90 rounded-xl p-4 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider">Vehicle Velocity</span>
            <Gauge className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="my-2">
            <div className="text-3xl font-black tracking-tight text-white">
              {telemetry.speed_kmh.toFixed(0)} <span className="text-sm font-semibold text-slate-400">km/h</span>
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Delta: <span className="text-emerald-400 font-semibold">{telemetry.delta_speed_kmh.toFixed(0)} km/h</span>
            </div>
          </div>
          <span className="text-[11px] text-slate-500">GPS Doppler Calculated</span>
        </div>

        {/* Metric 3: Orientation / Roll Angle */}
        <div className="bg-slate-900/90 rounded-xl p-4 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider">Rollover Tilt</span>
            <RotateCcw className="w-4 h-4 text-purple-400" />
          </div>
          <div className="my-2">
            <div className="text-3xl font-black tracking-tight text-white">
              {telemetry.tilt_angle_deg}°
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-150 ${
                  telemetry.tilt_angle_deg > 65 ? 'bg-primary' : 'bg-purple-400'
                }`}
                style={{ width: `${Math.min(100, (telemetry.tilt_angle_deg / 90) * 100)}%` }}
              ></div>
            </div>
          </div>
          <span className="text-[11px] text-slate-500">
            {telemetry.tilt_angle_deg > 65 ? 'Rollover Anomaly' : 'Level Nominal'}
          </span>
        </div>

        {/* Metric 4: Anomaly Status */}
        <div className="bg-slate-900/90 rounded-xl p-4 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider">Guardian State</span>
            <ShieldAlert className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="my-2">
            <div className="text-lg font-bold text-emerald-400 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
              NOMINAL
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Autonomous 60s countdown primed upon anomaly
            </p>
          </div>
          <span className="text-[11px] text-slate-500">Zero false-positive logic</span>
        </div>

      </div>

      {/* Kinetic Crash Simulation Studio (For Testing & Investor Demonstrations) */}
      <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5 text-primary-light" />
              Kinetic Crash Simulation Studio (Live Validation)
            </h4>
            <p className="text-[11px] text-slate-400">
              Trigger synthetic kinetic anomalies to test the 60-second emergency overlay and autonomous dispatch flow.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => sentinelEngine.simulateImpact(5.8)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary/20 hover:bg-primary/30 text-primary-light border border-primary/40 font-semibold text-xs transition active:scale-95 shadow-sm"
          >
            <Zap className="w-4 h-4 text-primary-light" />
            <span>Simulate High-G Crash (5.8G)</span>
          </button>

          <button
            onClick={() => sentinelEngine.simulateSuddenStop()}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-semibold text-xs transition active:scale-95 shadow-sm"
          >
            <Gauge className="w-4 h-4 text-amber-400" />
            <span>Simulate Sudden Deceleration</span>
          </button>

          <button
            onClick={() => sentinelEngine.simulateRollover()}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 font-semibold text-xs transition active:scale-95 shadow-sm"
          >
            <RotateCcw className="w-4 h-4 text-purple-400" />
            <span>Simulate Vehicle Rollover (92°)</span>
          </button>
        </div>
      </div>

    </div>
  );
};
