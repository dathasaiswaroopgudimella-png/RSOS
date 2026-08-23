import React, { useState, useEffect, useRef } from 'react';
import {
  AlertCircle, ShieldAlert, Heart, Zap, Flame,
  Bone, Activity, Car, Ambulance, Check, Loader2,
  Stethoscope, Sparkles, MapPin, Search, Building2, Wand2, X
} from 'lucide-react';
import { ApiService } from '../services/api';
import { getFuzzyLocationSuggestions, LocationPreset } from '../services/FuzzyLocationEngine';

interface ManualSOSProps {
  onTriggerSOS: (signals: string[], vehicleAvailable: boolean, notes: string, overrideLocation?: { lat: number; lon: number; name: string }) => void;
  isLoading: boolean;
}

interface SymptomOption {
  id: string;
  label: string;
  category: string;
  icon: string;
  severity: 'critical' | 'high' | 'medium';
  description: string;
}

const SYMPTOM_OPTIONS: SymptomOption[] = [
  {
    id: 'severe_crash',
    label: 'Road Collision / Impact',
    category: 'Trauma',
    icon: '🚗',
    severity: 'critical',
    description: 'High-speed vehicular crash, airbag deployment, or pedestrian impact'
  },
  {
    id: 'cardiac_arrest',
    label: 'Cardiac Arrest / Unconscious',
    category: 'Cardiac',
    icon: '❤️',
    severity: 'critical',
    description: 'Sudden collapse, unresponsive, no pulse, or severe crushing chest pain'
  },
  {
    id: 'stroke',
    label: 'Stroke (FAST Symptoms)',
    category: 'Neurological',
    icon: '🧠',
    severity: 'critical',
    description: 'Facial drooping, one-sided arm weakness, slurred speech'
  },
  {
    id: 'head_injury',
    label: 'Head / Spinal Trauma',
    category: 'Trauma',
    icon: '🤕',
    severity: 'critical',
    description: 'Loss of consciousness, concussion, neck pain, or bleeding from ears/nose'
  },
  {
    id: 'bleeding',
    label: 'Severe Hemorrhage',
    category: 'Bleeding',
    icon: '🩸',
    severity: 'high',
    description: 'Active arterial spurting, deep laceration, or major blood loss'
  },
  {
    id: 'breathing',
    label: 'Respiratory Distress',
    category: 'Pulmonary',
    icon: '🫁',
    severity: 'critical',
    description: 'Severe breathlessness, choking, acute asthma, or cyanosis (blue lips)'
  },
  {
    id: 'severe_burn',
    label: 'Severe Burn Injury',
    category: 'Burn',
    icon: '🔥',
    severity: 'high',
    description: 'Extensive fire, boiling liquid, or electrical burn over skin surface'
  },
  {
    id: 'fracture',
    label: 'Bone Fracture / Dislocation',
    category: 'Orthopedic',
    icon: '🦴',
    severity: 'medium',
    description: 'Deformed limb, severe joint pain, inability to bear weight'
  }
];

export const ManualSOS: React.FC<ManualSOSProps> = ({ onTriggerSOS, isLoading }) => {
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [vehicleAvailable, setVehicleAvailable] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');

  // Incident Location Override (optional – uses live GPS if not set)
  const [locationQuery, setLocationQuery] = useState('');
  const [locationSearching, setLocationSearching] = useState(false);
  const [resolvedLocation, setResolvedLocation] = useState<{ lat: number; lon: number; name: string } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [autocorrectNotice, setAutocorrectNotice] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<LocationPreset[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const locationWrapperRef = useRef<HTMLDivElement>(null);

  // Live typeahead suggestions as user types
  useEffect(() => {
    if (locationQuery.trim().length >= 2) {
      setSuggestions(getFuzzyLocationSuggestions(locationQuery.trim(), 5));
    } else {
      setSuggestions([]);
    }
  }, [locationQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (locationWrapperRef.current && !locationWrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handleSelectSuggestion = (preset: LocationPreset) => {
    setResolvedLocation({ lat: preset.lat, lon: preset.lon, name: `${preset.name}, ${preset.city}, ${preset.state}` });
    setLocationQuery('');
    setShowSuggestions(false);
    setLocationError(null);
    setAutocorrectNotice(null);
  };

  const handleLocationSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationQuery.trim()) return;
    setLocationSearching(true);
    setLocationError(null);
    setAutocorrectNotice(null);
    setShowSuggestions(false);
    try {
      const res = await ApiService.searchAddress(locationQuery.trim());
      if (res && res.lat && res.lon) {
        setResolvedLocation({ lat: res.lat, lon: res.lon, name: res.display_name });
        if (res.isAutocorrected) {
          setAutocorrectNotice(`✨ Auto-corrected "${locationQuery}" → ${res.display_name.split(',')[0]}`);
        }
        setLocationQuery('');
      } else {
        setLocationError('Could not find this location. Try a nearby landmark, district, or pincode.');
      }
    } catch {
      setLocationError('Location lookup failed. Check your connection.');
    } finally {
      setLocationSearching(false);
    }
  };

  const clearResolvedLocation = () => {
    setResolvedLocation(null);
    setAutocorrectNotice(null);
    setLocationError(null);
  };

  const toggleSymptom = (id: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleInstantSOS = () => {
    const signals = selectedSymptoms.length > 0 ? selectedSymptoms : ['severe_crash'];
    onTriggerSOS(signals, vehicleAvailable, notes, resolvedLocation || undefined);
  };

  return (
    <div className="space-y-6">
      
      {/* Giant Main Emergency SOS Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 sm:p-8 text-center space-y-6 relative overflow-hidden">
        
        {/* Ambient Subtle Background Highlight */}
        <div className="absolute inset-0 bg-gradient-to-b from-emergency-50/40 via-transparent to-transparent pointer-events-none" />

        <div className="space-y-2 relative z-10 max-w-xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emergency-100 text-emergency-800 border border-emergency-200">
            <ShieldAlert className="w-3.5 h-3.5 text-emergency-600" />
            <span>Emergency Triage Trigger</span>
          </div>
          
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            1-Tap Emergency Response
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Press the button below to instantly trigger clinical triage across 30,000+ national trauma facilities, calculate estimated response time, and generate life-saving directives.
          </p>
        </div>

        {/* Tactile Big SOS Button */}
        <div className="flex justify-center py-4 relative z-10">
          <button
            onClick={handleInstantSOS}
            disabled={isLoading}
            className="group relative flex items-center justify-center w-40 h-40 sm:w-48 sm:h-48 rounded-full bg-gradient-to-tr from-emergency-600 via-emergency-500 to-emergency-600 text-white shadow-emergency hover:scale-105 active:scale-95 transition-all duration-200 focus:outline-none"
          >
            {/* Animated Radiating Pulse Ring */}
            <div className="absolute inset-0 rounded-full bg-emergency-500/30 animate-pulse-ring pointer-events-none" />
            <div className="absolute -inset-3 rounded-full border border-emergency-300/40 pointer-events-none" />

            <div className="flex flex-col items-center justify-center space-y-1 z-10">
              {isLoading ? (
                <>
                  <Loader2 className="w-10 h-10 animate-spin" />
                  <span className="text-xs font-black uppercase tracking-wider">Evaluating...</span>
                </>
              ) : (
                <>
                  <span className="text-3xl sm:text-4xl font-black tracking-widest uppercase drop-shadow-md">
                    SOS
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emergency-100">
                    Press to Dispatch
                  </span>
                </>
              )}
            </div>
          </button>
        </div>

        {/* Selected Symptoms Count Badge */}
        <div className="text-xs text-slate-500 font-medium">
          {selectedSymptoms.length === 0 ? (
            <span>⚡ No symptoms selected — will default to <strong>Severe Crash Trauma</strong></span>
          ) : (
            <span className="text-emergency-700 font-bold">
              ✓ {selectedSymptoms.length} Clinical Symptom{selectedSymptoms.length > 1 ? 's' : ''} Active for Triage Ranking
            </span>
          )}
        </div>

      </div>

      {/* ── Incident Location Override (Fuzzy Search) ─────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <MapPin className="w-5 h-5 text-brand-600" />
          <div>
            <h3 className="text-sm font-black text-slate-900">Override Incident Location (Optional)</h3>
            <p className="text-[11px] text-slate-500">
              Use your live GPS by default, or type any locality, campus, pincode, or landmark — even if misspelled. Auto-corrects instantly.
            </p>
          </div>
        </div>

        {/* Active Resolved Override Badge */}
        {resolvedLocation && (
          <div className="flex items-center justify-between gap-2 bg-brand-50 border border-brand-200 rounded-2xl px-4 py-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <Check className="w-4 h-4 text-brand-600 shrink-0" />
              <div className="min-w-0">
                <span className="text-xs font-black text-brand-800 block truncate">{resolvedLocation.name}</span>
                <span className="text-[10px] text-brand-600 font-semibold">{resolvedLocation.lat.toFixed(4)}, {resolvedLocation.lon.toFixed(4)} · Overriding live GPS</span>
              </div>
            </div>
            <button type="button" onClick={clearResolvedLocation} className="text-brand-600 hover:text-brand-800 p-1 rounded-lg hover:bg-brand-100 transition shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Autocorrect Notice */}
        {autocorrectNotice && (
          <div className="flex items-center gap-1.5 text-xs text-brand-700 bg-brand-50 border border-brand-200 px-3 py-1.5 rounded-xl font-medium">
            <Wand2 className="w-3.5 h-3.5 text-brand-600 shrink-0" />
            <span>{autocorrectNotice}</span>
          </div>
        )}

        {/* Search Input + Dropdown */}
        {!resolvedLocation && (
          <div className="relative" ref={locationWrapperRef}>
            <form onSubmit={handleLocationSearch} className="flex gap-2">
              <div className="relative flex-grow">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={locationQuery}
                  onChange={(e) => {
                    setLocationQuery(e.target.value);
                    setShowSuggestions(true);
                    if (locationError) setLocationError(null);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="e.g. IIT BHU, Koramangala, Madhapur, Andheri West, 500081..."
                  className="w-full pl-10 pr-4 py-2.5 text-xs rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
                />
              </div>
              <button
                type="submit"
                disabled={locationSearching || !locationQuery.trim()}
                className="px-4 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95 shrink-0"
              >
                {locationSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                <span>Set</span>
              </button>
            </form>

            {/* Live Typeahead Suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 overflow-hidden divide-y divide-slate-100">
                <div className="px-3.5 py-2 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Wand2 className="w-3 h-3 text-brand-600" />
                  <span>Smart Matches:</span>
                </div>
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSuggestion(s)}
                    className="w-full text-left px-4 py-2.5 hover:bg-brand-50/60 flex items-center justify-between transition group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Building2 className="w-4 h-4 text-slate-400 group-hover:text-brand-600 transition shrink-0" />
                      <div>
                        <span className="text-xs font-bold text-slate-800 group-hover:text-brand-700 transition">{s.name}</span>
                        <span className="text-[11px] text-slate-400 block">{s.city}, {s.state}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 group-hover:bg-brand-100 text-slate-600 group-hover:text-brand-700 transition shrink-0">
                      {s.category}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {locationError && (
              <p className="mt-1.5 text-xs text-emergency-600 font-semibold">{locationError}</p>
            )}
          </div>
        )}
      </div>

      {/* Categorized Clinical Symptom Matrix */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-7 space-y-5">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-brand-600" />
              Specify Clinical Symptoms &amp; Trauma Signs
            </h3>
            <p className="text-xs text-slate-500">
              Selecting specific conditions allows our Clinical Suitability Calculus to prioritize specialized hospitals (Cath-Lab, Neuro ICU, Burn Ward, Blood Bank).
            </p>
          </div>
          
          {selectedSymptoms.length > 0 && (
            <button
              onClick={() => setSelectedSymptoms([])}
              className="text-xs text-slate-500 hover:text-slate-800 underline font-medium self-start sm:self-auto"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Symptoms Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {SYMPTOM_OPTIONS.map((symptom) => {
            const isSelected = selectedSymptoms.includes(symptom.id);
            return (
              <button
                key={symptom.id}
                type="button"
                onClick={() => toggleSymptom(symptom.id)}
                className={`group text-left p-4 rounded-2xl border transition-all duration-150 flex flex-col justify-between space-y-3 ${
                  isSelected
                    ? 'bg-emergency-50/80 border-emergency-400 ring-2 ring-emergency-400 shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200/80 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-2xl">{symptom.icon}</span>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition ${
                    isSelected
                      ? 'bg-emergency-600 border-emergency-600 text-white'
                      : 'border-slate-300 bg-white'
                  }`}>
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 group-hover:text-emergency-700 transition">
                      {symptom.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-2">
                    {symptom.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Vehicle & Transport Availability Selector */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-800 block">
              Transport Availability:
            </span>
            <span className="text-[11px] text-slate-500">
              Does the victim or bystander have a vehicle for immediate private transit?
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setVehicleAvailable(true)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                vehicleAvailable
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Car className="w-4 h-4" />
              <span>Vehicle Available</span>
            </button>

            <button
              type="button"
              onClick={() => setVehicleAvailable(false)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                !vehicleAvailable
                  ? 'bg-emergency-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Ambulance className="w-4 h-4" />
              <span>Ambulance Urgent</span>
            </button>
          </div>

        </div>

        {/* Additional Notes */}
        <div className="pt-3 border-t border-slate-100 space-y-2">
          <label className="text-xs font-bold text-slate-800 block">
            Additional Notes (Optional):
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. 3 victims, bike crash near highway overpass, one unresponsive..."
            rows={2}
            className="w-full px-3.5 py-2.5 text-xs rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none transition"
          />
        </div>

      </div>

    </div>
  );
};
