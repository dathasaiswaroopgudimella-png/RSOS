import React, { useState } from 'react';
import {
  AlertTriangle, Heart, Brain, Flame, Car, Droplets, Bone,
  Wind, ShieldAlert, Zap, Eye, Baby, Stethoscope, CheckCircle2,
  Navigation, HelpCircle, Search
} from 'lucide-react';
import { useHaptics } from '../hooks/useHaptics';

interface ManualSOSProps {
  onTriggerSOS: (signals: string[], vehicleAvailable: boolean, notes: string) => void;
  isLoading: boolean;
}

interface SignalOption {
  id: string;
  label: string;
  category: 'trauma' | 'critical' | 'moderate';
  icon: any;
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

const CLINICAL_SIGNALS: SignalOption[] = [
  // Trauma & Collisions
  { id: 'severe_crash', label: 'Severe Vehicle Crash', category: 'trauma', icon: Car, urgency: 'CRITICAL' },
  { id: 'bleeding', label: 'Heavy Bleeding / Arterial', category: 'trauma', icon: Droplets, urgency: 'CRITICAL' },
  { id: 'head_injury', label: 'Head / Spinal Trauma', category: 'trauma', icon: Brain, urgency: 'CRITICAL' },
  { id: 'fracture', label: 'Severe Bone Fracture', category: 'trauma', icon: Bone, urgency: 'HIGH' },
  { id: 'amputation', label: 'Traumatic Amputation', category: 'trauma', icon: AlertTriangle, urgency: 'CRITICAL' },
  { id: 'severe_burn', label: 'Severe Thermal Burn', category: 'trauma', icon: Flame, urgency: 'CRITICAL' },

  // Critical Medical
  { id: 'cardiac_arrest', label: 'Cardiac Arrest (No Pulse)', category: 'critical', icon: Heart, urgency: 'CRITICAL' },
  { id: 'chest_pain', label: 'Severe Chest Pain / Heart Attack', category: 'critical', icon: Heart, urgency: 'CRITICAL' },
  { id: 'stroke', label: 'Stroke Symptoms (FAST)', category: 'critical', icon: Brain, urgency: 'CRITICAL' },
  { id: 'unconscious', label: 'Unconscious / Unresponsive', category: 'critical', icon: ShieldAlert, urgency: 'CRITICAL' },
  { id: 'breathing', label: 'Severe Respiratory Distress', category: 'critical', icon: Wind, urgency: 'CRITICAL' },
  { id: 'poisoning', label: 'Poisoning / Chemical Ingestion', category: 'critical', icon: AlertTriangle, urgency: 'CRITICAL' },

  // Moderate & Pediatric
  { id: 'pediatric_emergency', label: 'Pediatric / Infant Emergency', category: 'moderate', icon: Baby, urgency: 'HIGH' },
  { id: 'seizure', label: 'Active Epileptic Seizure', category: 'moderate', icon: Zap, urgency: 'HIGH' },
  { id: 'electric_shock', label: 'High-Voltage Electric Shock', category: 'moderate', icon: Zap, urgency: 'HIGH' },
  { id: 'eye_injury', label: 'Penetrating Eye Injury', category: 'moderate', icon: Eye, urgency: 'HIGH' },
  { id: 'animal_bite', label: 'Venomous Snake / Animal Bite', category: 'moderate', icon: AlertTriangle, urgency: 'HIGH' },
  { id: 'high_fever', label: 'High Fever / Convulsions', category: 'moderate', icon: Stethoscope, urgency: 'MEDIUM' },
];

export const ManualSOS: React.FC<ManualSOSProps> = ({ onTriggerSOS, isLoading }) => {
  const [selectedSignals, setSelectedSignals] = useState<string[]>([]);
  const [vehicleAvailable, setVehicleAvailable] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const { triggerLightTap, triggerHeavyImpact } = useHaptics();

  const toggleSignal = (id: string) => {
    triggerLightTap();
    setSelectedSignals((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleTrigger = () => {
    triggerHeavyImpact();
    onTriggerSOS(
      selectedSignals.length > 0 ? selectedSignals : ['severe_crash'],
      vehicleAvailable,
      notes
    );
  };

  const filteredSignals = CLINICAL_SIGNALS.filter((s) =>
    s.label.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="w-full space-y-8 max-w-5xl mx-auto">
      
      {/* Giant Pulsating SOS Trigger Button */}
      <div className="flex flex-col items-center justify-center pt-2 pb-4">
        <div className="relative flex items-center justify-center">
          <div className="absolute -inset-4 rounded-full bg-primary/20 animate-pulse-sos"></div>
          <div className="absolute -inset-8 rounded-full bg-primary/10 animate-ping"></div>

          <button
            onClick={handleTrigger}
            disabled={isLoading}
            className="relative z-10 w-44 h-44 sm:w-52 sm:h-52 rounded-full bg-gradient-to-br from-primary-light via-primary to-primary-dark text-white font-black text-3xl sm:text-4xl tracking-tight shadow-glow-primary hover:scale-105 active:scale-95 transition-all flex flex-col items-center justify-center border-4 border-white/30 cursor-pointer group select-none"
          >
            <AlertTriangle className="w-10 h-10 sm:w-12 sm:h-12 mb-1 group-hover:animate-bounce" />
            <span>SOS</span>
            <span className="text-[11px] font-bold uppercase tracking-widest text-primary-fixed mt-1">
              {isLoading ? 'ANALYZING...' : 'TAP FOR TRIAGE'}
            </span>
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-4 text-center max-w-sm font-medium">
          Instant 1-Tap Emergency Trigger. Cross-references 30,000+ national hospitals with your live GPS location.
        </p>
      </div>

      {/* Clinical Symptom & Incident Matrix */}
      <div className="bg-obsidian-surface rounded-2xl border border-obsidian-border p-6 shadow-xl space-y-6">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-primary-light" />
              Clinical Symptom &amp; Incident Matrix
            </h3>
            <p className="text-xs text-slate-400">
              Select all symptoms present to calculate specialized Trauma/ICU hospital capabilities.
            </p>
          </div>

          {/* Search Filter */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search symptoms (e.g. burn, cardiac)..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Signals Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {filteredSignals.map((signal) => {
            const isSelected = selectedSignals.includes(signal.id);
            const Icon = signal.icon;

            return (
              <button
                key={signal.id}
                onClick={() => toggleSignal(signal.id)}
                className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all active:scale-[0.98] ${
                  isSelected
                    ? 'bg-primary/20 border-primary text-white shadow-glow-primary'
                    : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      isSelected
                        ? 'bg-primary text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block leading-tight">
                      {signal.label}
                    </span>
                    <span
                      className={`text-[10px] font-semibold uppercase ${
                        signal.urgency === 'CRITICAL'
                          ? 'text-primary-light'
                          : signal.urgency === 'HIGH'
                          ? 'text-amber-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {signal.urgency}
                    </span>
                  </div>
                </div>

                {isSelected && (
                  <CheckCircle2 className="w-5 h-5 text-primary-light shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Environmental Options: Vehicle & Emergency Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
          
          {/* Vehicle Mode Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/90 border border-slate-800">
            <div>
              <span className="text-xs font-bold text-white block">Private Vehicle Available?</span>
              <span className="text-[11px] text-slate-400">
                {vehicleAvailable ? 'User driving / navigating to facility' : 'Requires Ambulance 108 Dispatch'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setVehicleAvailable(!vehicleAvailable)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                vehicleAvailable
                  ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50'
                  : 'bg-primary/30 text-primary-light border border-primary/50'
              }`}
            >
              {vehicleAvailable ? 'Vehicle Ready' : 'Need Ambulance'}
            </button>
          </div>

          {/* Quick Notes Input */}
          <div className="flex flex-col justify-center">
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional details (e.g., Highway NH-44, 2 victims, trapped)..."
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-primary"
            />
          </div>

        </div>

      </div>

    </div>
  );
};
