import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert, Activity, Check, Car, Ambulance,
  FileText, Search, MapPin, X, Wand2, Building2,
  Sparkles, Compass, AlertTriangle, HeartPulse, Brain,
  Droplets, Wind, Flame, Bone, Zap, UserX, Stethoscope, LandPlot, MapPinCheck, Loader2
} from 'lucide-react';
import { ApiService } from '../services/api';
import { getFuzzyLocationSuggestions, LocationPreset } from '../services/FuzzyLocationEngine';

interface ManualSOSProps {
  onTriggerSOS: (
    signals: string[],
    vehicleAvailable: boolean,
    notes?: string,
    overrideLocation?: { lat: number; lon: number; name: string }
  ) => void;
  isLoading?: boolean;
}

interface SymptomOption {
  id: string;
  label: string;
  category: string;
  icon: string;
  severity: 'critical' | 'high' | 'medium';
  description: string;
}

export interface LivePlaceSuggestion {
  name: string;
  subtext: string;
  lat: number;
  lon: number;
  type: string;
}

const SYMPTOM_OPTIONS: SymptomOption[] = [
  {
    id: 'severe_crash',
    label: 'Severe Road Collision',
    category: 'Trauma',
    icon: '🚗',
    severity: 'critical',
    description: 'Blunt force impact, multi-vehicle rollover, or pedestrian strike'
  },
  {
    id: 'cardiac_arrest',
    label: 'Cardiac Arrest / Unresponsive',
    category: 'Cardiac',
    icon: '❤️',
    severity: 'critical',
    description: 'No pulse, not breathing normally, collapsed victim'
  },
  {
    id: 'chest_pain',
    label: 'Severe Chest Pain / Pressure',
    category: 'Cardiac',
    icon: '🫀',
    severity: 'critical',
    description: 'Crushing central chest tightness radiating to arm or jaw'
  },
  {
    id: 'stroke',
    label: 'Suspected Acute Stroke',
    category: 'Neurological',
    icon: '🧠',
    severity: 'critical',
    description: 'Facial droop, unilateral arm weakness, slurred speech'
  },
  {
    id: 'head_injury',
    label: 'Severe Head / Cranial Trauma',
    category: 'Trauma',
    icon: '🤕',
    severity: 'critical',
    description: 'Loss of consciousness, unequal pupils, ear or nose bleed'
  },
  {
    id: 'bleeding',
    label: 'Massive External Hemorrhage',
    category: 'Hemorrhage',
    icon: '🩸',
    severity: 'high',
    description: 'Continuous arterial spurting or heavy uncontrollable blood loss'
  },
  {
    id: 'breathing',
    label: 'Severe Respiratory Distress',
    category: 'Respiratory',
    icon: '🫁',
    severity: 'critical',
    description: 'Struggling to breathe, choking, cyanosis (blue lips)'
  },
  {
    id: 'severe_burn',
    label: 'Severe Thermal / Chemical Burn',
    category: 'Burn',
    icon: '🔥',
    severity: 'high',
    description: 'Deep partial or full-thickness burns covering large body surface'
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

  // Incident Location Override
  const [locationQuery, setLocationQuery] = useState('');
  const [locationSearching, setLocationSearching] = useState(false);
  const [resolvedLocation, setResolvedLocation] = useState<{ lat: number; lon: number; name: string } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [autocorrectNotice, setAutocorrectNotice] = useState<string | null>(null);
  const [liveSuggestions, setLiveSuggestions] = useState<LivePlaceSuggestion[]>([]);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const locationWrapperRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<any>(null);

  // Debounced Live OpenStreetMap + Local Preset Query for ALL Indian Places
  useEffect(() => {
    const q = locationQuery.trim();
    if (q.length < 2) {
      setLiveSuggestions([]);
      setIsFetchingSuggestions(false);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setIsFetchingSuggestions(true);

    debounceTimerRef.current = setTimeout(async () => {
      const results: LivePlaceSuggestion[] = [];

      // 1. Local matches
      const localMatches = getFuzzyLocationSuggestions(q, 4);
      for (const m of localMatches) {
        results.push({
          name: m.name,
          subtext: `${m.city}, ${m.state}`,
          lat: m.lat,
          lon: m.lon,
          type: m.category,
        });
      }

      // 2. All-India Live OpenStreetMap query
      try {
        const clean = encodeURIComponent(q);
        const resp = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${clean}&format=jsonv2&addressdetails=1&countrycodes=in&limit=8`,
          {
            headers: {
              'Accept-Language': 'en',
              'User-Agent': 'RoadSOS-All-India-Place-Search/6.5',
            },
          }
        );

        if (resp.ok) {
          const items = await resp.json();
          if (Array.isArray(items)) {
            for (const item of items) {
              const addr = item.address || {};
              const placeName =
                item.name ||
                addr.road ||
                addr.suburb ||
                addr.town ||
                addr.village ||
                addr.city ||
                item.display_name.split(',')[0];

              const subparts = [
                addr.suburb,
                addr.town || addr.village || addr.city,
                addr.county || addr.state_district,
                addr.state,
                addr.postcode,
              ].filter(Boolean);

              const subtext = subparts.length > 0 ? subparts.join(', ') : item.display_name;

              const isDuplicate = results.some(
                (r) => Math.abs(r.lat - parseFloat(item.lat)) < 0.01 && Math.abs(r.lon - parseFloat(item.lon)) < 0.01
              );

              if (!isDuplicate) {
                results.push({
                  name: placeName,
                  subtext: subtext,
                  lat: parseFloat(item.lat),
                  lon: parseFloat(item.lon),
                  type: addr.postcode === q ? 'Pincode' : item.type || 'Town / Locality',
                });
              }
            }
          }
        }
      } catch (e) {
        console.warn('[ManualSOS Location] Live query error:', e);
      }

      setLiveSuggestions(results.slice(0, 8));
      setIsFetchingSuggestions(false);
    }, 280);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
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

  const handleSelectSuggestion = (s: LivePlaceSuggestion) => {
    setResolvedLocation({ lat: s.lat, lon: s.lon, name: `${s.name}, ${s.subtext}` });
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
        setLocationError('Could not find this location. Try a nearby town, landmark, or 6-digit pincode.');
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
            Press the button below to instantly trigger clinical triage across 30,273+ national trauma facilities, calculate estimated response time, and generate life-saving directives.
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
              <span className="text-3xl sm:text-4xl font-black tracking-wider">
                SOS
              </span>
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-emergency-100">
                {isLoading ? 'Triaging...' : 'Dispatch Now'}
              </span>
            </div>
          </button>
        </div>

        {/* Selected Symptoms Indicator */}
        <div className="relative z-10 flex flex-wrap justify-center items-center gap-2 pt-2">
          {selectedSymptoms.length === 0 ? (
            <span className="text-xs text-slate-400 italic">
              Defaulting to Critical Vehicular Crash Protocol. (Select specific symptoms below if known)
            </span>
          ) : (
            selectedSymptoms.map((sId) => {
              const sym = SYMPTOM_OPTIONS.find((s) => s.id === sId);
              return (
                <span
                  key={sId}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-brand-50 text-brand-700 border border-brand-200 animate-fadeIn"
                >
                  <span>{sym?.icon}</span>
                  <span>{sym?.label}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSymptom(sId);
                    }}
                    className="hover:text-emergency-600 ml-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })
          )}
        </div>

      </div>

      {/* Symptoms Matrix & Clinical Context Section */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
        
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-brand-600" />
            <h3 className="text-base sm:text-lg font-black text-slate-900">
              Clinical Symptoms &amp; Trauma Presentation
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Select any observed patient symptoms to route to hospitals with matching specialty readiness (Cath-Lab, Neuro ICU, Trauma Bay).
          </p>
        </div>

        {/* Symptoms Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SYMPTOM_OPTIONS.map((symptom) => {
            const isSelected = selectedSymptoms.includes(symptom.id);
            return (
              <button
                key={symptom.id}
                type="button"
                onClick={() => toggleSymptom(symptom.id)}
                className={`p-4 rounded-2xl border text-left transition-all duration-200 flex items-start gap-3 group ${
                  isSelected
                    ? 'border-brand-500 bg-brand-50/70 ring-2 ring-brand-500/20 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-white'
                }`}
              >
                <div className="text-2xl shrink-0 p-1.5 rounded-xl bg-white shadow-xs border border-slate-100 group-hover:scale-110 transition-transform">
                  {symptom.icon}
                </div>
                <div className="min-w-0 flex-grow">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-brand-600 transition">
                      {symptom.label}
                    </span>
                    {isSelected && <Check className="w-4 h-4 text-brand-600 shrink-0" />}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                    {symptom.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Transport Mode & Situation Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
          
          {/* Transport Availability Toggle */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Patient Transport Capability
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setVehicleAvailable(true)}
                className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition ${
                  vehicleAvailable
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold ring-2 ring-emerald-500/20'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Car className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="text-xs block font-bold">Private Vehicle</span>
                  <span className="text-[10px] text-slate-500">Immediate direct drive</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setVehicleAvailable(false)}
                className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition ${
                  !vehicleAvailable
                    ? 'border-emergency-500 bg-emergency-50 text-emergency-900 font-bold ring-2 ring-emergency-500/20'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Ambulance className="w-4 h-4 text-emergency-600 shrink-0" />
                <div>
                  <span className="text-xs block font-bold">Ambulance 108</span>
                  <span className="text-[10px] text-slate-500">Wait for rescue dispatch</span>
                </div>
              </button>
            </div>
          </div>

          {/* Incident Situation Notes */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Incident Situation Notes (Optional)
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. 2 victims, pedestrian hit, highway milestone 42, trapped..."
                className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
              />
            </div>
          </div>

        </div>

        {/* Location Override Search Box with All-India Live Typeahead Dropdown */}
        <div className="pt-4 border-t border-slate-100 space-y-2.5" ref={locationWrapperRef}>
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-brand-600" />
              Incident Location Override (Optional — Defaults to active GPS)
            </span>
            {resolvedLocation && (
              <button
                type="button"
                onClick={clearResolvedLocation}
                className="text-[11px] font-semibold text-emergency-600 hover:underline flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Reset to live GPS
              </button>
            )}
          </label>

          {resolvedLocation ? (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs font-medium text-emerald-800">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Override Active: <strong>{resolvedLocation.name}</strong></span>
              </div>
              <button
                type="button"
                onClick={clearResolvedLocation}
                className="text-emerald-700 hover:text-emerald-900 text-xs font-bold"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="relative">
              <form onSubmit={handleLocationSearch} className="flex gap-2">
                <div className="relative flex-grow">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={locationQuery}
                    onFocus={() => setShowSuggestions(true)}
                    onChange={(e) => {
                      setLocationQuery(e.target.value);
                      setShowSuggestions(true);
                      if (locationError) setLocationError(null);
                    }}
                    placeholder="Search ANY town, village, mandal, or 6-digit pincode across India..."
                    className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
                  />
                  {isFetchingSuggestions && (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  )}
                </div>
                <button
                  type="submit"
                  disabled={locationSearching || !locationQuery.trim()}
                  className="px-4 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition active:scale-95 shrink-0"
                >
                  {locationSearching ? 'Searching...' : 'Set Spot'}
                </button>
              </form>

              {/* Live Dropdown for Manual SOS */}
              {showSuggestions && liveSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 overflow-hidden divide-y divide-slate-100 max-h-60 overflow-y-auto animate-fadeIn">
                  <div className="px-3.5 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-brand-700">
                      <MapPinCheck className="w-3.5 h-3.5 text-brand-600" />
                      Live Matches across India:
                    </span>
                  </div>
                  {liveSuggestions.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSuggestion(s)}
                      className="w-full text-left px-4 py-2.5 hover:bg-brand-50/70 flex items-center justify-between transition group"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <LandPlot className="w-4 h-4 text-slate-400 group-hover:text-brand-600 transition shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-900 group-hover:text-brand-700 transition block truncate">
                            {s.name}
                          </span>
                          <span className="text-[10px] text-slate-500 block truncate">
                            {s.subtext}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 group-hover:bg-brand-100 text-slate-600 group-hover:text-brand-700 transition shrink-0 ml-2">
                        {s.type}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {autocorrectNotice && (
            <div className="text-xs text-brand-700 bg-brand-50 border border-brand-200 px-3 py-1.5 rounded-xl font-medium">
              {autocorrectNotice}
            </div>
          )}

          {locationError && (
            <p className="text-xs text-emergency-600 font-semibold">{locationError}</p>
          )}
        </div>

      </div>

    </div>
  );
};
