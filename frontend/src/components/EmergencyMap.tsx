import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Hospital } from '../types';
import { Navigation, MapPin } from 'lucide-react';

interface EmergencyMapProps {
  userLat: number;
  userLon: number;
  hospitals: Hospital[];
  selectedHospital?: Hospital;
  onSelectHospital?: (hospital: Hospital) => void;
}

export const EmergencyMap: React.FC<EmergencyMapProps> = ({
  userLat,
  userLon,
  hospitals,
  selectedHospital,
  onSelectHospital,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize Map instance if not already created
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView([userLat, userLon], 13);

      // Dark Matter Map Tiles
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(map);

      // Add Zoom Control at bottom right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    if (routeLayerRef.current) {
      routeLayerRef.current.remove();
      routeLayerRef.current = null;
    }

    // 1. Add User Pulse Marker
    const userIcon = L.divIcon({
      className: 'user-marker',
      html: `
        <div style="position:relative;display:flex;align-items:center;justify-content:center;width:32px;height:32px;">
          <div style="position:absolute;width:100%;height:100%;border-radius:50%;background:#bc000a;opacity:0.3;animation:pulseRing 1.8s infinite;"></div>
          <div style="width:16px;height:16px;border-radius:50%;background:#bc000a;border:3px solid #ffffff;box-shadow:0 0 10px rgba(188,0,10,0.6);"></div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const userMarker = L.marker([userLat, userLon], { icon: userIcon })
      .addTo(map)
      .bindPopup('<b>Your Live Location</b><br/>Emergency GPS locked');
    markersRef.current.push(userMarker);

    // 2. Add Hospital Markers
    const bounds = L.latLngBounds([[userLat, userLon]]);

    hospitals.forEach((h, idx) => {
      const isTop = selectedHospital?.sr_no === h.sr_no || (!selectedHospital && idx === 0);
      const hospitalIcon = L.divIcon({
        className: 'hospital-marker',
        html: `
          <div style="position:relative;display:flex;align-items:center;justify-content:center;width:${isTop ? '40px' : '30px'};height:${isTop ? '40px' : '30px'};">
            <div style="width:100%;height:100%;border-radius:12px;background:${isTop ? '#bc000a' : '#0f172a'};color:#ffffff;border:2px solid #ffffff;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.3);font-size:${isTop ? '18px' : '14px'};font-weight:bold;">
              +
            </div>
          </div>
        `,
        iconSize: isTop ? [40, 40] : [30, 30],
        iconAnchor: isTop ? [20, 20] : [15, 15],
      });

      const marker = L.marker([h.lat, h.lon], { icon: hospitalIcon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family:sans-serif;font-size:12px;">
            <b style="color:#bc000a;">${h.hospital_name}</b><br/>
            <span>Distance: ${h.distance_km} km</span><br/>
            <span>Phone: ${h.primary_phone || '108'}</span>
          </div>
        `);

      marker.on('click', () => {
        if (onSelectHospital) onSelectHospital(h);
      });

      markersRef.current.push(marker);
      bounds.extend([h.lat, h.lon]);
    });

    // 3. Draw Route to Active/Top Hospital
    const targetHospital = selectedHospital || hospitals[0];
    if (targetHospital) {
      const routePolyline = L.polyline(
        [
          [userLat, userLon],
          [targetHospital.lat, targetHospital.lon],
        ],
        {
          color: '#bc000a',
          weight: 4,
          opacity: 0.8,
          dashArray: '8, 8',
        }
      ).addTo(map);

      routeLayerRef.current = routePolyline;
    }

    // Fit map bounds to view both user and hospitals
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  }, [userLat, userLon, hospitals, selectedHospital]);

  return (
    <div className="w-full h-72 sm:h-96 rounded-2xl overflow-hidden border border-obsidian-border shadow-2xl relative">
      <div ref={mapContainerRef} className="w-full h-full z-0" />
      
      {/* Map Overlay Badge */}
      <div className="absolute top-3 left-3 z-10 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-200 flex items-center gap-2 shadow-lg">
        <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
        <span className="font-semibold">Live Transit Route</span>
      </div>

      {/* Target Hospital Mini Floating Chip */}
      {selectedHospital && (
        <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-xs z-10 bg-slate-950/90 backdrop-blur-md p-3 rounded-xl border border-primary/40 text-xs text-white shadow-2xl flex items-center justify-between gap-3">
          <div>
            <strong className="block text-primary-light font-bold line-clamp-1">
              {selectedHospital.hospital_name}
            </strong>
            <span className="text-[11px] text-slate-400">
              {selectedHospital.distance_km} km away · ~{Math.max(3, Math.round(selectedHospital.distance_km * 2.3))} mins transit
            </span>
          </div>
          <a
            href={`https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLon}&destination=${selectedHospital.lat},${selectedHospital.lon}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg bg-primary text-white hover:bg-primary-container active:scale-95 transition shrink-0"
            title="Open Turn-by-Turn GPS"
          >
            <Navigation className="w-4 h-4" />
          </a>
        </div>
      )}
    </div>
  );
};
