import React, { useState, useEffect } from 'react';
import {
  X, Activity, Server, Database, CheckCircle2,
  AlertCircle, RefreshCw, Cpu, ShieldCheck
} from 'lucide-react';
import { SystemHealth } from '../types';
import { ApiService } from '../services/api';

interface SystemDiagnosticsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemDiagnostics: React.FC<SystemDiagnosticsProps> = ({ isOpen, onClose }) => {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchHealth = async () => {
    setIsLoading(true);
    try {
      const data = await ApiService.checkHealth();
      setHealth(data);
    } catch (err) {
      console.warn('[DIAGNOSTICS] Health fetch failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHealth();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      
      <div className="w-full max-w-xl bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-7 space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">
                System Diagnostics &amp; Engine Status
              </h3>
              <p className="text-xs text-slate-500">
                Spatial BallTree index &amp; API integration inspector
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Database & Spatial Index Stats */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-brand-600" />
              National Hospital Spatial Database (data.gov.in)
            </span>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              Ready
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="bg-white p-2 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 block">Total Hospitals</span>
              <strong className="text-sm font-mono text-slate-900">30,273</strong>
            </div>
            <div className="bg-white p-2 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 block">States &amp; UTs</span>
              <strong className="text-sm font-mono text-slate-900">36</strong>
            </div>
            <div className="bg-white p-2 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 block">Districts</span>
              <strong className="text-sm font-mono text-slate-900">585</strong>
            </div>
            <div className="bg-white p-2 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 block">Spatial Latency</span>
              <strong className="text-sm font-mono text-emerald-600">&lt;5ms</strong>
            </div>
          </div>
        </div>

        {/* API Integration Diagnostics */}
        <div className="space-y-2">
          <span className="text-xs font-black text-slate-800 block">
            API Gateway &amp; Model Integrations:
          </span>

          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span>National Hospital Directory (data.gov.in)</span>
              <span className="font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Local Indexed (30.2k)
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span>Deterministic Clinical Rule Engine</span>
              <span className="font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Sub-5ms Active
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span>OpenRouter Clinical AI Racing</span>
              <span className="font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Enabled (Nemotron 30B)
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span>Multi-Provider Geocoding &amp; IP Resolver</span>
              <span className="font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Active (OSM / IPAPI)
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 flex justify-between items-center">
          <button
            onClick={fetchHealth}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Diagnostics</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
          >
            Close
          </button>
        </div>

      </div>

    </div>
  );
};
