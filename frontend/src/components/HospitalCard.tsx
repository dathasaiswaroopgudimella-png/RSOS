import React from 'react';
import {
  Building2, Phone, Navigation, Award,
  Shield, Check, MapPin, Bed, Activity, Compass, LandPlot
} from 'lucide-react';
import { Hospital } from '../types';

interface HospitalCardProps {
  hospital: Hospital;
  isTopChoice?: boolean;
  onSelect?: () => void;
  userLat: number;
  userLon: number;
}

export const HospitalCard: React.FC<HospitalCardProps> = ({
  hospital,
  isTopChoice = false,
  onSelect,
  userLat,
  userLon,
}) => {
  const phoneToCall = hospital.primary_phone || hospital.emergency_num || hospital.ambulance_phone || '108';
  const cleanPhone = phoneToCall.replace(/[^\d+]/g, '');

  const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLon}&destination=${hospital.lat},${hospital.lon}&travelmode=driving`;

  const score = hospital.suitability_score || 85.0;

  // Extract best representative town / area / locality
  const townOrArea =
    hospital.town && hospital.town !== '0' && hospital.town !== ''
      ? hospital.town
      : hospital.subdistrict && hospital.subdistrict !== '0' && hospital.subdistrict !== ''
      ? hospital.subdistrict
      : hospital.address
      ? hospital.address.split(',')[0]
      : hospital.district || 'City Center';

  const fullLocation = [
    hospital.district ? `${hospital.district} District` : '',
    hospital.state || '',
    hospital.pincode && hospital.pincode !== '0' ? `PIN: ${hospital.pincode}` : ''
  ].filter(Boolean).join(', ');

  return (
    <div
      onClick={onSelect}
      className={`group relative p-5 sm:p-6 rounded-3xl bg-white border transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md ${
        isTopChoice
          ? 'border-brand-400 ring-2 ring-brand-400/30'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      
      {/* Top Choice Floating Ribbon */}
      {isTopChoice && (
        <div className="absolute -top-3 left-6 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-brand-600 to-brand-700 text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
          <Award className="w-3.5 h-3.5 text-amber-300" />
          <span>Top Clinical Choice</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        
        {/* Left Hospital Info */}
        <div className="space-y-2.5 min-w-0 flex-grow">
          
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-brand-600 transition">
              {hospital.hospital_name}
            </h4>
            
            {hospital.tier === 'tier_1' && (
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                Apex Level-1 Trauma
              </span>
            )}
          </div>

          {/* Prominent Town / Area / Locality Badge */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-50 text-brand-800 font-bold border border-brand-200">
              <LandPlot className="w-3.5 h-3.5 text-brand-600 shrink-0" />
              <span>Area / Locality: {townOrArea}</span>
            </div>

            {fullLocation && (
              <span className="text-xs text-slate-600 font-semibold">
                📍 {fullLocation}
              </span>
            )}
          </div>

          {/* Full Street Address & Landmark */}
          {hospital.address && hospital.address !== '0' && (
            <p className="text-xs text-slate-500 flex items-start gap-1.5 leading-relaxed bg-slate-50 p-2 rounded-xl border border-slate-100">
              <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
              <span><strong>Address:</strong> {hospital.address}</span>
            </p>
          )}

          {/* Specialties & Facilities Pill Badges */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {hospital.total_beds && hospital.total_beds > 0 ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                <Bed className="w-3 h-3 text-slate-500" />
                {hospital.total_beds} Beds
              </span>
            ) : null}

            {hospital.specialties && hospital.specialties.toLowerCase().includes('trauma') && (
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                Trauma Bay
              </span>
            )}

            {hospital.facilities && hospital.facilities.toLowerCase().includes('icu') && (
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                Critical Care ICU
              </span>
            )}

            {hospital.facilities && hospital.facilities.toLowerCase().includes('blood') && (
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                24x7 Blood Bank
              </span>
            )}

            {hospital.match_reasons && hospital.match_reasons.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                ✓ {hospital.match_reasons[0]}
              </span>
            )}
          </div>

        </div>

        {/* Right Distance & Score Badge */}
        <div className="flex sm:flex-col items-center sm:items-end justify-between shrink-0 gap-2">
          
          {/* Suitability Score */}
          <div className="flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 shadow-sm">
            <span className="text-[10px] font-black text-emerald-700 uppercase">Match</span>
            <span className="text-xs sm:text-sm font-black text-emerald-800 font-mono">
              {score > 100 ? 99 : Math.round(score)}%
            </span>
          </div>

          {/* Distance */}
          <div className="text-right">
            <span className="text-base sm:text-lg font-black text-slate-900 font-mono">
              {hospital.distance_km.toFixed(1)} km
            </span>
            <span className="text-[11px] text-slate-500 block font-semibold">
              ~{Math.max(3, Math.round(hospital.distance_km * 2.2))} mins drive
            </span>
          </div>

        </div>

      </div>

      {/* Action Buttons: Dial & Navigate */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        
        <a
          href={`tel:${cleanPhone}`}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emergency-600 hover:bg-emergency-700 text-white text-xs font-black transition active:scale-95 shadow-sm"
        >
          <Phone className="w-4 h-4" />
          <span>Call Hospital ({phoneToCall})</span>
        </a>

        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-black transition active:scale-95 border border-brand-200"
        >
          <Navigation className="w-4 h-4 text-brand-600" />
          <span>Start GPS Navigation</span>
        </a>

      </div>

    </div>
  );
};
