import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Hospital } from '../types';

interface EmergencyMapProps {
  userLat: number;
  userLon: number;
  hospitals: Hospital[];
  selectedHospital?: Hospital;
  onSelectHospital?: (hospital: Hospital) => void;
  onMapClick?: (lat: number, lon: number) => void;
}

export const EmergencyMap: React.FC<EmergencyMapProps> = ({
  userLat,
  userLon,
  hospitals,
  selectedHospital,
  onSelectHospital,
  onMapClick,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [userLat, userLon],
        zoom: 13,
        scrollWheelZoom: false,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;

      map.on('click', (e: L.LeafletMouseEvent) => {
        if (onMapClick) {
          onMapClick(e.latlng.lat, e.latlng.lng);
        }
      });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update View & Markers when lat, lon, or hospitals change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    if (!map || !markersGroup) return;

    map.setView([userLat, userLon], 13);
    markersGroup.clearLayers();

    // 1. User Incident Marker
    const userIcon = L.divIcon({
      className: 'custom-user-marker',
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px;">
          <div style="position: absolute; width: 32px; height: 32px; border-radius: 9999px; background-color: rgba(239, 68, 68, 0.35); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="width: 22px; height: 22px; border-radius: 9999px; background-color: #dc2626; border: 2px solid #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: #ffffff; font-size: 8px; font-weight: 900; font-family: sans-serif;">
            SOS
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    L.marker([userLat, userLon], { icon: userIcon })
      .bindPopup(`
        <div style="font-family: system-ui, sans-serif; font-size: 12px; padding: 2px;">
          <strong style="color: #dc2626; display: block;">🚨 Emergency Incident Site</strong>
          <span style="color: #64748b; font-size: 11px;">${userLat.toFixed(4)}, ${userLon.toFixed(4)}</span>
        </div>
      `)
      .addTo(markersGroup);

    const targetHospital = selectedHospital || (hospitals.length > 0 ? hospitals[0] : null);

    // 2. Hospital Markers
    hospitals.forEach((hospital, idx) => {
      const isTop = idx === 0;
      const isSelected = targetHospital?.sr_no === hospital.sr_no;

      const bgCol = isSelected ? '#2563eb' : isTop ? '#dc2626' : '#1e293b';
      const labelText = isTop ? '⭐ APEX' : '🏥 HOSPITAL';

      const hIcon = L.divIcon({
        className: 'custom-hosp-marker',
        html: `
          <div style="cursor: pointer; padding: 3px 8px; border-radius: 8px; background-color: ${bgCol}; color: #ffffff; font-weight: 800; font-size: 10px; font-family: sans-serif; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.25); white-space: nowrap; border: 1px solid rgba(255,255,255,0.4);">
            ${labelText}
          </div>
        `,
        iconSize: [75, 24],
        iconAnchor: [37, 12],
      });

      const m = L.marker([hospital.lat, hospital.lon], { icon: hIcon })
        .bindPopup(`
          <div style="font-family: system-ui, sans-serif; font-size: 12px; min-width: 180px;">
            <strong style="color: #0f172a; display: block; font-size: 13px; font-weight: 800;">${hospital.hospital_name}</strong>
            <p style="color: #64748b; font-size: 11px; margin: 2px 0 6px 0;">${hospital.address || `${hospital.district}, ${hospital.state}`}</p>
            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0; padding-top: 4px;">
              <span style="font-weight: 800; color: #2563eb;">${hospital.distance_km.toFixed(1)} km</span>
              <a href="tel:${hospital.primary_phone || '108'}" style="color: #dc2626; font-weight: 700; text-decoration: underline;">Call Hospital</a>
            </div>
          </div>
        `)
        .addTo(markersGroup);

      m.on('click', () => {
        if (onSelectHospital) onSelectHospital(hospital);
      });
    });

    // 3. Routing Polyline
    if (targetHospital) {
      L.polyline(
        [
          [userLat, userLon],
          [targetHospital.lat, targetHospital.lon],
        ],
        {
          color: '#2563eb',
          weight: 4,
          opacity: 0.85,
          dashArray: '6, 8',
        }
      ).addTo(markersGroup);
    }
  }, [userLat, userLon, hospitals, selectedHospital, onSelectHospital, onMapClick]);

  return (
    <div className="w-full h-80 sm:h-96 rounded-3xl overflow-hidden border border-slate-200 shadow-sm relative bg-slate-100">
      
      {/* Top Banner Tag */}
      <div className="absolute top-3 left-3 z-[1000] bg-white/90 backdrop-blur-md px-3 py-1 rounded-xl border border-slate-200 text-[11px] font-bold text-slate-700 shadow-sm">
        📍 Incident Radar • Click map to reposition
      </div>

      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};
