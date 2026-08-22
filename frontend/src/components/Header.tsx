import React from 'react';
import {
  ShieldAlert, Radio, Activity, PhoneCall,
  UserCheck, Server, AlertCircle, Sparkles, Navigation
} from 'lucide-react';
import { AppMode } from '../types';

interface HeaderProps {
  mode: AppMode;
  onToggleMode: (mode: AppMode) => void;
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
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-2 sm:gap-4">
          
          {/* Brand Logo & Tagline */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-emergency-500 to-emergency-600 flex items-center justify-center text-white shadow-md shadow-emergency-500/20">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg sm:text-xl font-black tracking-tight text-slate-900">
                  Road<span className="text-emergency-600">SOS</span>
                </span>
                <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emergency-50 text-emergency-700 border border-emergency-200">
                  National Triage
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden md:block">
                Autonomous Crash Sensing &amp; Clinical Decision Intelligence
              </p>
            </div>
          </div>

          {/* Center Mode Switcher: Autonomous Sentinel vs Manual SOS */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/80">
            <button
              onClick={() => onToggleMode('AUTOMATIC')}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 ${
                mode === 'AUTOMATIC'
                  ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${mode === 'AUTOMATIC' ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
              <Radio className="w-3.5 h-3.5" />
              <span>Sentinel Auto</span>
            </button>

            <button
              onClick={() => onToggleMode('MANUAL')}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 ${
                mode === 'MANUAL'
                  ? 'bg-white text-emergency-600 shadow-sm border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Manual SOS</span>
            </button>
          </div>

          {/* Right Action Icons: Quick 108 dialer, Medical ID, Diagnostics */}
          <div className="flex items-center gap-2">
            
            {/* Quick 108 Ambulance Call */}
            <a
              href="tel:108"
              className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emergency-50 hover:bg-emergency-100 text-emergency-700 border border-emergency-200 text-xs font-bold transition active:scale-95"
            >
              <PhoneCall className="w-3.5 h-3.5 text-emergency-600 animate-bounce" />
              <span>Dial 108</span>
            </a>

            {/* Medical ID Vault */}
            <button
              onClick={onOpenContacts}
              title="Medical ID & ICE Contacts"
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
            >
              <UserCheck className="w-4 h-4 text-brand-600" />
              <span className="hidden sm:inline">Medical ID</span>
            </button>

            {/* System Diagnostics */}
            <button
              onClick={onOpenDiagnostics}
              title="API & Spatial Index Diagnostics"
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
            >
              <Server className="w-4 h-4 text-slate-600" />
              <span className="hidden md:inline">Status</span>
            </button>

          </div>

        </div>
      </div>
    </header>
  );
};
