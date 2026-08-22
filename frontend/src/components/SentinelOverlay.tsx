import React, { useState, useEffect } from 'react';
import { ShieldAlert, Volume2, X, Send, Activity } from 'lucide-react';
import { SentinelAlert } from '../types';
import { audioSiren } from '../services/audioSiren';
import { useHaptics } from '../hooks/useHaptics';

interface SentinelOverlayProps {
  alert: SentinelAlert | null;
  onCancel: () => void;
  onConfirmSos: (alert: SentinelAlert) => void;
}

export const SentinelOverlay: React.FC<SentinelOverlayProps> = ({
  alert,
  onCancel,
  onConfirmSos,
}) => {
  const [countdown, setCountdown] = useState<number>(30);
  const { triggerSosPattern } = useHaptics();

  useEffect(() => {
    if (!alert) {
      setCountdown(30);
      audioSiren.stop();
      return;
    }

    // Start siren sound and vibration
    audioSiren.start();
    triggerSosPattern();

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          audioSiren.stop();
          onConfirmSos(alert);
          return 0;
        }
        // Re-pulse haptics
        if (prev % 3 === 0) {
          triggerSosPattern();
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      audioSiren.stop();
    };
  }, [alert, onConfirmSos, triggerSosPattern]);

  if (!alert) return null;

  const progressPercent = ((30 - countdown) / 30) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-lg animate-fadeIn">
      
      <div className="w-full max-w-lg bg-white rounded-3xl border-2 border-emergency-500 shadow-2xl p-6 sm:p-8 text-center space-y-6 relative overflow-hidden animate-siren">
        
        {/* Top Emergency Pulse Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emergency-100 text-emergency-800 text-xs font-black uppercase tracking-wider border border-emergency-300">
          <ShieldAlert className="w-4 h-4 text-emergency-600 animate-bounce" />
          <span>Severe Kinetic Collision Detected</span>
        </div>

        {/* Dynamic Countdown Circle */}
        <div className="relative flex items-center justify-center w-36 h-36 sm:w-44 sm:h-44 mx-auto">
          
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="44"
              className="stroke-slate-100"
              strokeWidth="8"
              fill="transparent"
            />
            <circle
              cx="50"
              cy="50"
              r="44"
              className="stroke-emergency-600 transition-all duration-1000"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray="276.46"
              strokeDashoffset={276.46 - (276.46 * progressPercent) / 100}
              strokeLinecap="round"
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl sm:text-5xl font-black font-mono text-slate-900 tracking-tight">
              {countdown}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Seconds
            </span>
          </div>
        </div>

        {/* Telemetry Summary */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
          <div className="flex justify-between font-mono">
            <span>Impact Force:</span>
            <strong className="text-emergency-700">{alert.telemetry.g_force.toFixed(2)}G</strong>
          </div>
          <div className="flex justify-between font-mono">
            <span>Anomaly Class:</span>
            <strong className="uppercase text-slate-900">{alert.type}</strong>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-sm mx-auto">
          Broadcasting GPS coordinates and clinical telemetry to receiving trauma centers and emergency contacts when timer expires.
        </p>

        {/* Dual Actions: Cancel vs Confirm Immediately */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          
          <button
            onClick={() => {
              audioSiren.stop();
              onCancel();
            }}
            className="w-full py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition active:scale-95 border border-slate-200"
          >
            <X className="w-4 h-4" />
            <span>I'M OK (CANCEL)</span>
          </button>

          <button
            onClick={() => {
              audioSiren.stop();
              onConfirmSos(alert);
            }}
            className="w-full py-3.5 rounded-2xl bg-emergency-600 hover:bg-emergency-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition active:scale-95 shadow-md shadow-emergency-600/30"
          >
            <Send className="w-4 h-4" />
            <span>DISPATCH SOS NOW</span>
          </button>

        </div>

      </div>

    </div>
  );
};
