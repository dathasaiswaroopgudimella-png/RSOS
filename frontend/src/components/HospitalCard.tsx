import React from 'react';
import {
  Phone, Navigation, CheckCircle, Shield, Award, Heart,
  Share2, AlertCircle, Building2, Bed, Activity
} from 'lucide-react';
import { Hospital } from '../types';

interface HospitalCardProps {
  hospital: Hospital;
  isTopChoice?: boolean;
  onSelect?: () => void;
  userLat?: number;
  userLon?: number;
}

export const HospitalCard: React.FC<HospitalCardProps> = ({
  hospital,
  isTopChoice = false,
  onSelect,
  userLat,
  userLon,
}) => {
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${userLat || ''},${userLon || ''}&destination=${hospital.lat},${hospital.lon}&travelmode=driving`;
  const primaryPhone = hospital.primary_phone || hospital.emergency_num || hospital.ambulance_phone || '108';

  const handleShare = () => {
    const text = `🚨 Emergency Patient routed to ${hospital.hospital_name} (${hospital.distance_km} km away). Phone: ${primaryPhone}. Route: ${googleMapsUrl}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div
      onClick={onSelect}
      className={`rounded-2xl border transition-all p-5 relative overflow-hidden ${
        isTopChoice
          ? 'bg-gradient-to-b from-slate-900 via-obsidian-surface to-obsidian-surface border-primary/50 shadow-glow-primary'
          : 'bg-obsidian-surface border-obsidian-border hover:border-slate-700 shadow-xl'
      }`}
    >
      {/* Top Banner Tag */}
      {isTopChoice && (
        <div className="absolute top-0 right-0 bg-primary text-white text-[10px] font-extrabold uppercase px-3 py-1 rounded-bl-xl tracking-wider shadow-md flex items-center gap-1">
          <Award className="w-3 h-3" />
          <span>Top Clinical Recommendation</span>
        </div>
      )}

      {/* Hospital Identity & Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-inner ${
              isTopChoice
                ? 'bg-primary/20 text-primary-light border border-primary/40'
                : 'bg-slate-800 text-cyan-400 border border-slate-700'
            }`}
          >
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-base font-extrabold text-white leading-snug">
              {hospital.hospital_name}
            </h4>
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
              {hospital.address || `${hospital.district}, ${hospital.state}`}
            </p>
          </div>
        </div>
      </div>

      {/* Suitability Score & Metrics Row */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Suitability Score Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold font-mono">
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          <span>{hospital.suitability_score.toFixed(0)}% Clinical Match</span>
        </div>

        {/* Distance & Time Badge */}
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold">
          <Navigation className="w-3 h-3 text-cyan-400" />
          <span>{hospital.distance_km.toFixed(1)} km</span>
          <span className="text-slate-400">· ~{Math.max(3, Math.round(hospital.distance_km * 2.3))} mins</span>
        </div>

        {/* Beds Badge */}
        {hospital.total_beds && hospital.total_beds > 0 ? (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-xs">
            <Bed className="w-3 h-3 text-purple-400" />
            <span>{hospital.total_beds} Beds</span>
          </div>
        ) : null}

        {/* Tier / Care Type */}
        {hospital.hospital_care_type && (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
            {hospital.hospital_care_type}
          </span>
        )}
      </div>

      {/* Clinical Match Reasons */}
      {hospital.match_reasons && hospital.match_reasons.length > 0 && (
        <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800/80 mb-4 space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Why this facility was selected:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {hospital.match_reasons.map((reason, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 text-xs text-slate-200 bg-slate-800/90 px-2 py-0.5 rounded-md border border-slate-700/60"
              >
                <CheckCircle className="w-3 h-3 text-emerald-400" />
                {reason}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Specialties & Facilities Snippet */}
      {hospital.specialties && (
        <div className="text-xs text-slate-400 mb-4 line-clamp-2">
          <strong className="text-slate-300">Key Specialties:</strong> {hospital.specialties}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
        {/* Call Hospital */}
        <a
          href={`tel:${primaryPhone}`}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-container text-white text-xs font-bold shadow-glow-primary active:scale-95 transition"
        >
          <Phone className="w-4 h-4" />
          <span>Call ({primaryPhone})</span>
        </a>

        {/* Start GPS Navigation */}
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold border border-slate-700 active:scale-95 transition"
        >
          <Navigation className="w-4 h-4 text-cyan-400" />
          <span>Start GPS Nav</span>
        </a>

        {/* WhatsApp Share Button */}
        <button
          onClick={handleShare}
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 active:scale-95 transition"
          title="Share route via WhatsApp"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};
