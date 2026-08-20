import React, { useEffect, useState } from 'react';
import { AlertOctagon, XCircle, Send, Volume2, ShieldAlert } from 'lucide-react';
import { SentinelAlert } from '../types';
import { emergencySiren } from '../services/audioSiren';
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
  const { triggerSosVibration, cancelVibration } = useHaptics();

  useEffect(() => {
    if (!alert) return;

    // Reset countdown
    setCountdown(30);

    // Start Audio Siren & Vibration
    emergencySiren.startSiren();
    triggerSosVibration();

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          emergencySiren.stopSiren();
          cancelVibration();
          onConfirmSos(alert);
          return 0;
        }
        // Re-pulse vibration every 3 seconds
        if (prev % 3 === 0) {
          triggerSosVibration();
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      emergencySiren.stopSiren();
      cancelVibration();
    };
  }, [alert]);

  if (!alert) return null;

  const handleCancelClick = () => {
    emergencySiren.stopSiren();
    cancelVibration();
    onCancel();
  };

  const handleConfirmClick = () => {
    emergencySiren.stopSiren();
    cancelVibration();
    onConfirmSos(alert);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-between p-6 sm:p-10 animate-fadeIn select-none">
      
      {/* Top Banner */}
      <div className="flex items-center justify-between w-full max-w-lg pt-2">
        <div className="flex items-center gap-2 text-primary-light font-bold text-xs uppercase tracking-wider">
          <Volume2 className="w-4 h-4 animate-ping" />
          <span>Auditory Siren &amp; Haptic Alert Active</span>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-primary/20 text-primary-light border border-primary/40 font-mono font-bold">
          CODE-RED OVERRIDE
        </span>
      </div>

      {/* Center Countdown Sphere */}
      <div className="flex flex-col items-center text-center my-auto space-y-6 max-w-md w-full">
        
        {/* Pulsing Safety Rings */}
        <div className="relative flex items-center justify-center w-48 h-48 sm:w-56 sm:h-56">
          <div className="absolute inset-0 rounded-full bg-primary/30 animate-pulse-ring"></div>
          <div className="absolute inset-4 rounded-full bg-primary/20 animate-ping"></div>
          
          <div className="relative z-10 w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-gradient-to-br from-primary to-primary-dark flex flex-col items-center justify-center text-white shadow-glow-primary border-4 border-white/20">
            <span className="text-5xl sm:text-6xl font-black font-mono tracking-tighter leading-none">
              {countdown}
            </span>
            <span className="text-[11px] uppercase font-bold tracking-widest text-primary-fixed mt-1">
              Seconds
            </span>
          </div>
        </div>

        {/* Anomaly Heading */}
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            <AlertOctagon className="w-7 h-7 text-primary-light animate-bounce" />
            Crash Anomaly Detected
          </h2>
          <p className="text-sm text-slate-300 font-medium leading-relaxed">
            Severe kinetic deceleration or high-G impact was recorded. Emergency broadcast will transmit automatically unless cancelled.
          </p>
        </div>

        {/* Telemetry Snapshot Pill */}
        <div className="bg-slate-900/90 rounded-xl px-4 py-3 border border-slate-800 text-xs text-slate-300 w-full flex items-center justify-around">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Anomaly Type</span>
            <strong className="text-primary-light uppercase font-mono">{alert.type.replace('_', ' ')}</strong>
          </div>
          <div className="h-6 w-px bg-slate-800"></div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold">G-Force Peak</span>
            <strong className="text-amber-400 font-mono">{alert.telemetry.g_force.toFixed(2)} G</strong>
          </div>
          <div className="h-6 w-px bg-slate-800"></div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Speed Delta</span>
            <strong className="text-cyan-400 font-mono">{alert.telemetry.delta_speed_kmh.toFixed(0)} km/h</strong>
          </div>
        </div>

      </div>

      {/* Bottom Dual Action Buttons (Thumb-Zone Optimized) */}
      <div className="w-full max-w-md flex flex-col sm:flex-row gap-4 pb-2">
        <button
          onClick={handleCancelClick}
          className="flex-1 py-4 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-base flex items-center justify-center gap-2 border border-slate-700 active:scale-95 transition shadow-lg"
        >
          <XCircle className="w-5 h-5 text-emerald-400" />
          <span>I AM OK (CANCEL)</span>
        </button>

        <button
          onClick={handleConfirmClick}
          className="flex-1 py-4 px-6 rounded-2xl bg-primary hover:bg-primary-container text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-glow-primary active:scale-95 transition border border-primary-light"
        >
          <Send className="w-5 h-5" />
          <span>BROADCAST SOS NOW</span>
        </button>
      </div>

    </div>
  );
};
