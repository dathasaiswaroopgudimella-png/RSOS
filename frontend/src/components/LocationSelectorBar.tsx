import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Compass, Check, Loader2, Sparkles, Crosshair, Wand2, Building2, LandPlot, MapPinCheck } from 'lucide-react';
import { ApiService } from '../services/api';
import { getFuzzyLocationSuggestions, LocationPreset } from '../services/FuzzyLocationEngine';

interface LocationSelectorBarProps {
  currentAddress: string;
  lat: number;
  lon: number;
  gpsAccuracy: number | null;
  onLocationSelect: (lat: number, lon: number, addressName: string) => void;
  onRefreshGps: () => void;
  isGpsLocating?: boolean;
}

export interface LivePlaceSuggestion {
  name: string;
  subtext: string;
  lat: number;
  lon: number;
  type: string;
}

const POPULAR_METROS = [
  { name: 'Hyderabad', state: 'Telangana', lat: 17.3850, lon: 78.4867 },
  { name: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lon: 77.5946 },
  { name: 'Delhi NCR', state: 'Delhi', lat: 28.6139, lon: 77.2090 },
  { name: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lon: 72.8777 },
  { name: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lon: 80.2707 },
  { name: 'Varanasi', state: 'Uttar Pradesh', lat: 25.3176, lon: 82.9739 },
  { name: 'Warangal', state: 'Telangana', lat: 17.9689, lon: 79.5941 },
  { name: 'Kolkata', state: 'West Bengal', lat: 22.5726, lon: 88.3639 },
  { name: 'Pune', state: 'Maharashtra', lat: 18.5204, lon: 73.8567 },
  { name: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lon: 75.7873 },
  { name: 'Visakhapatnam', state: 'Andhra Pradesh', lat: 17.6868, lon: 83.2185 },
  { name: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8467, lon: 80.9462 },
];

export const LocationSelectorBar: React.FC<LocationSelectorBarProps> = ({
  currentAddress,
  lat,
  lon,
  gpsAccuracy,
  onLocationSelect,
  onRefreshGps,
  isGpsLocating = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [autocorrectNotice, setAutocorrectNotice] = useState<string | null>(null);
  const [liveSuggestions, setLiveSuggestions] = useState<LivePlaceSuggestion[]>([]);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<any>(null);

  // Debounced Live OpenStreetMap + Local Preset Query for ALL Indian Towns, Villages & Pincodes
  useEffect(() => {
    const q = searchQuery.trim();
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

      // 1. Check local fuzzy presets first for instant response
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

      // 2. Query Live OpenStreetMap Nominatim for ALL Indian places (towns, mandals, taluks, villages, pincodes)
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

              // Avoid duplicates
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
        console.warn('[LocationSearch] Live query error:', e);
      }

      setLiveSuggestions(results.slice(0, 8));
      setIsFetchingSuggestions(false);
    }, 280);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectSuggestion = (s: LivePlaceSuggestion) => {
    onLocationSelect(s.lat, s.lon, `${s.name}, ${s.subtext}`);
    setSearchQuery('');
    setShowSuggestions(false);
    setSearchError(null);
    setAutocorrectNotice(null);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError(null);
    setAutocorrectNotice(null);
    setShowSuggestions(false);

    try {
      const res = await ApiService.searchAddress(searchQuery.trim());
      if (res && res.lat && res.lon) {
        onLocationSelect(res.lat, res.lon, res.display_name);
        if (res.isAutocorrected) {
          setAutocorrectNotice(`✨ Auto-corrected "${searchQuery}" → ${res.display_name.split(',')[0]}`);
        }
        setSearchQuery('');
      } else {
        setSearchError('Location not found. Try searching your campus, district, or 6-digit pincode.');
      }
    } catch (err) {
      setSearchError('Unable to resolve address. Please check connection or select a city below.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-4 sm:p-6 space-y-4" ref={wrapperRef}>
      
      {/* Top Banner: Current Resolved Location & GPS Accuracy */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-emergency-50 text-emergency-600 flex items-center justify-center shrink-0 border border-emergency-100 shadow-sm">
            <MapPin className="w-5 h-5 animate-bounce" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                Active Incident Location
              </span>
              {gpsAccuracy !== null && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  GPS ±{Math.round(gpsAccuracy)}m
                </span>
              )}
            </div>
            <p className="text-sm sm:text-base font-black text-slate-900 truncate" title={currentAddress}>
              {currentAddress || `${lat.toFixed(4)}, ${lon.toFixed(4)}`}
            </p>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
              <span>Coordinates: {lat.toFixed(4)}° N, {lon.toFixed(4)}° E</span>
            </div>
          </div>
        </div>

        {/* GPS Refresh Button */}
        <button
          onClick={onRefreshGps}
          disabled={isGpsLocating}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-bold transition active:scale-95 shrink-0 border border-brand-200"
        >
          {isGpsLocating ? (
            <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
          ) : (
            <Crosshair className="w-4 h-4 text-brand-600" />
          )}
          <span>{isGpsLocating ? 'Acquiring GPS...' : 'Acquire My GPS Location'}</span>
        </button>
      </div>

      {/* Search Input Bar with All-India Live Typeahead Dropdown */}
      <div className="relative">
        <form onSubmit={handleSearch} className="relative flex flex-col sm:flex-row items-stretch gap-2">
          <div className="relative flex-grow">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onFocus={() => setShowSuggestions(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
                if (searchError) setSearchError(null);
              }}
              placeholder="Search ANY town, village, mandal, campus, or 6-digit pincode across India (e.g. 500034, Lanka Varanasi, Koramangala)..."
              className="w-full pl-10 pr-4 py-3 text-xs sm:text-sm rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
            />
            {isFetchingSuggestions && (
              <Loader2 className="w-4 h-4 animate-spin text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            )}
          </div>
          <button
            type="submit"
            disabled={isSearching || !searchQuery.trim()}
            className="px-5 py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition active:scale-95 shrink-0"
          >
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Compass className="w-4 h-4" />}
            <span>Locate &amp; Triage</span>
          </button>
        </form>

        {/* Live Typeahead Autocomplete Dropdown for ALL Indian Towns, Villages & Pincodes */}
        {showSuggestions && liveSuggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden divide-y divide-slate-100 max-h-72 overflow-y-auto animate-fadeIn">
            <div className="px-3.5 py-2 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-brand-700">
                <MapPinCheck className="w-3.5 h-3.5 text-brand-600" />
                Live Matching Towns &amp; Places across India ({liveSuggestions.length}):
              </span>
              <span className="text-[10px] text-slate-400">Click to Select</span>
            </div>
            {liveSuggestions.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectSuggestion(s)}
                className="w-full text-left px-4 py-3 hover:bg-brand-50/70 flex items-center justify-between transition group"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <LandPlot className="w-4 h-4 text-slate-400 group-hover:text-brand-600 transition shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <span className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-brand-700 transition block truncate">
                      {s.name}
                    </span>
                    <span className="text-[11px] text-slate-500 block truncate">
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

      {autocorrectNotice && (
        <div className="flex items-center gap-1.5 text-xs text-brand-700 bg-brand-50 border border-brand-200 px-3 py-1.5 rounded-xl font-medium animate-fadeIn">
          <Wand2 className="w-3.5 h-3.5 text-brand-600 shrink-0" />
          <span>{autocorrectNotice}</span>
        </div>
      )}

      {searchError && (
        <p className="text-xs text-emergency-600 font-semibold">{searchError}</p>
      )}

      {/* Popular Metro Quick-Pills for 1-Click Instant Testing */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Quick Select Any City / Hub:</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {POPULAR_METROS.map((metro) => {
            const isSelected = Math.abs(metro.lat - lat) < 0.1 && Math.abs(metro.lon - lon) < 0.1;
            return (
              <button
                key={metro.name}
                type="button"
                onClick={() => onLocationSelect(metro.lat, metro.lon, `${metro.name}, ${metro.state}`)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-brand-600 text-white shadow-sm ring-2 ring-brand-500/30'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900'
                }`}
              >
                {isSelected && <Check className="w-3 h-3 text-white" />}
                <span>{metro.name}</span>
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
};
