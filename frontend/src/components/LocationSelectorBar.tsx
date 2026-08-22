import React, { useState } from 'react';
import { MapPin, Search, Navigation, Compass, Check, Loader2, Sparkles } from 'lucide-react';
import { ApiService } from '../services/api';

interface LocationSelectorBarProps {
  currentAddress: string;
  lat: number;
  lon: number;
  gpsAccuracy: number | null;
  onLocationSelect: (lat: number, lon: number, addressName: string) => void;
  onRefreshGps: () => void;
  isGpsLocating?: boolean;
}

const POPULAR_METROS = [
  { name: 'Hyderabad', state: 'Telangana', lat: 17.3850, lon: 78.4867 },
  { name: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lon: 77.5946 },
  { name: 'Delhi NCR', state: 'Delhi', lat: 28.6139, lon: 77.2090 },
  { name: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lon: 72.8777 },
  { name: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lon: 80.2707 },
  { name: 'Kolkata', state: 'West Bengal', lat: 22.5726, lon: 88.3639 },
  { name: 'Pune', state: 'Maharashtra', lat: 18.5204, lon: 73.8567 },
  { name: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lon: 75.7873 },
  { name: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8467, lon: 80.9462 },
  { name: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lon: 72.5714 },
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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError(null);
    try {
      const res = await ApiService.searchAddress(searchQuery.trim());
      if (res && res.lat && res.lon) {
        onLocationSelect(res.lat, res.lon, res.display_name);
        setSearchQuery('');
      } else {
        setSearchError('Location not found. Try entering a city, pincode, or landmark.');
      }
    } catch (err) {
      setSearchError('Unable to resolve address. Please select a city below.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-5 space-y-4">
      
      {/* Top Banner: Current Resolved Location & GPS Accuracy */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emergency-50 text-emergency-600 flex items-center justify-center shrink-0 border border-emergency-100">
            <MapPin className="w-5 h-5 animate-bounce" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Incident Location
              </span>
              {gpsAccuracy !== null && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  GPS ±{Math.round(gpsAccuracy)}m
                </span>
              )}
            </div>
            <p className="text-sm sm:text-base font-bold text-slate-800 truncate" title={currentAddress}>
              {currentAddress || `${lat.toFixed(4)}, ${lon.toFixed(4)}`}
            </p>
          </div>
        </div>

        {/* GPS Refresh Button */}
        <button
          onClick={onRefreshGps}
          disabled={isGpsLocating}
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition active:scale-95 shrink-0"
        >
          {isGpsLocating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-600" />
          ) : (
            <Navigation className="w-3.5 h-3.5 text-brand-600" />
          )}
          <span>{isGpsLocating ? 'Locating...' : 'Use My GPS'}</span>
        </button>
      </div>

      {/* Search Input Bar */}
      <form onSubmit={handleSearch} className="relative flex items-center gap-2">
        <div className="relative flex-grow">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (searchError) setSearchError(null);
            }}
            placeholder="Search any locality, pincode, or landmark (e.g. Jubilee Hills, 500034, Connaught Place)..."
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
          />
        </div>
        <button
          type="submit"
          disabled={isSearching || !searchQuery.trim()}
          className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-sm transition active:scale-95"
        >
          {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Compass className="w-4 h-4" />}
          <span>Search</span>
        </button>
      </form>

      {searchError && (
        <p className="text-xs text-emergency-600 font-medium">{searchError}</p>
      )}

      {/* Popular Metro Quick-Pills for 1-Click Instant Testing */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          <Sparkles className="w-3 h-3 text-amber-500" />
          <span>Quick Select Metro City:</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {POPULAR_METROS.map((metro) => {
            const isSelected = Math.abs(metro.lat - lat) < 0.1 && Math.abs(metro.lon - lon) < 0.1;
            return (
              <button
                key={metro.name}
                type="button"
                onClick={() => onLocationSelect(metro.lat, metro.lon, `${metro.name}, ${metro.state}`)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 ${
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
