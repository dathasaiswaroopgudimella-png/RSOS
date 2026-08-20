import React from 'react';
import { Shield, Activity, Radio, Phone, User, Settings, AlertTriangle, Satellite } from 'lucide-react';
import { AppMode } from '../types';

interface HeaderProps {
  mode: AppMode;
  onToggleMode: (newMode: AppMode) => void;
  gpsAccuracy: number | null;
  sensorActive: boolean;
  onOpenContacts: () => void;
  onOpenDiagnostics: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  mode,
  onToggleMode,
  gpsAccuracy,
  sensorActive,
  onOpenContacts,
  onOpenDiagnostics,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full bg-obsidian-surface/90 backdrop-blur-xl border-b border-obsidian-border shadow-lg px-4 md:px-8 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* Brand & System Title */}
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-white shadow-glow-primary">
              <Shield className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1.5">
                  Road<span className="text-primary-light">SOS</span>
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary/20 text-primary-light border border-primary/30">
                  v5.0 Enterprise
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium hidden sm:block">
                Autonomous & Clinical Emergency Decision Intelligence
              </p>
            </div>
          </div>

          {/* Mobile Right Controls */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={onOpenContacts}
              className="p-2 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 active:scale-95 transition"
              title="Medical ID & ICE Contacts"
            >
              <User className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenDiagnostics}
              className="p-2 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 active:scale-95 transition"
              title="System Diagnostics"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Center: Mode Switcher */}
        <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800 shadow-inner w-full md:w-auto justify-center">
          <button
            onClick={() => onToggleMode('AUTOMATIC')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              mode === 'AUTOMATIC'
                ? 'bg-primary text-white shadow-glow-primary scale-[1.02]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${mode === 'AUTOMATIC' ? 'animate-pulse' : ''}`} />
            <span>Sentinel Auto Mode</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping ml-0.5"></span>
          </button>
          <button
            onClick={() => onToggleMode('MANUAL')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              mode === 'MANUAL'
                ? 'bg-primary text-white shadow-glow-primary scale-[1.02]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Manual Triage</span>
          </button>
        </div>

        {/* Right: Telemetry Badges & Quick Action Dialers */}
        <div className="hidden md:flex items-center gap-4">
          
          {/* GPS HUD */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
            <Satellite className="w-3.5 h-3.5 text-cyan-400" />
            <span>GPS:</span>
            <span className="font-semibold text-emerald-400">
              {gpsAccuracy !== null ? `±${gpsAccuracy.toFixed(0)}m` : 'Locked'}
            </span>
          </div>

          {/* Quick Call 108 */}
          <a
            href="tel:108"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 text-xs font-bold transition active:scale-95 shadow-sm"
          >
            <Phone className="w-3.5 h-3.5 text-emerald-400" />
            <span>Call 108</span>
          </a>

          {/* Medical Profile Modal Trigger */}
          <button
            onClick={onOpenContacts}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 active:scale-95 text-xs font-semibold transition border border-slate-700"
          >
            <User className="w-3.5 h-3.5 text-slate-300" />
            <span>Medical ID</span>
          </button>

          {/* Diagnostics Button */}
          <button
            onClick={onOpenDiagnostics}
            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 active:scale-95 transition border border-slate-700"
            title="System Diagnostics & Database Inspector"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

      </div>
    </header>
  );
};
