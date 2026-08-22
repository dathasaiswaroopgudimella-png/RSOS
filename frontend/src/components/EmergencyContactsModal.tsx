import React, { useState, useEffect } from 'react';
import {
  X, UserPlus, Trash2, Heart, Share2,
  Shield, Check, UserCheck, PhoneCall, AlertTriangle
} from 'lucide-react';
import { EmergencyContact, MedicalProfile } from '../types';
import { ApiService } from '../services/api';

interface EmergencyContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userLat: number;
  userLon: number;
}

const DEFAULT_PROFILE: MedicalProfile = {
  name: 'Saiswaroop Gudimella',
  age: '23',
  bloodGroup: 'O+ Positive',
  allergies: 'Penicillin (Mild), Dust',
  conditions: 'No prior cardiovascular history',
  emergencyNotes: 'Wear contact lenses; carry emergency asthma inhaler',
  vehicleReg: 'TS 09 EA 4482 (Hyundai Verna)',
};

const DEFAULT_CONTACTS: EmergencyContact[] = [
  { id: '1', name: 'Dr. Ramesh (Family Physician)', phone: '+91 98480 22338', relation: 'Physician', notifyOnSos: true },
  { id: '2', name: 'Srinivas (Father)', phone: '+91 94401 55667', relation: 'Family ICE', notifyOnSos: true },
];

export const EmergencyContactsModal: React.FC<EmergencyContactsModalProps> = ({
  isOpen,
  onClose,
  userLat,
  userLon,
}) => {
  const [profile, setProfile] = useState<MedicalProfile>(DEFAULT_PROFILE);
  const [contacts, setContacts] = useState<EmergencyContact[]>(DEFAULT_CONTACTS);
  const [activeTab, setActiveTab] = useState<'profile' | 'contacts' | 'dispatch'>('profile');
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen) return null;

  const handleShareWhatsApp = async () => {
    const res = await ApiService.broadcastDispatch({
      lat: userLat,
      lon: userLon,
      patient_name: profile.name,
      blood_group: profile.bloodGroup,
      crash_severity: 'critical',
      hospital_name: 'Nearest Level-1 Apex Trauma Center',
      hospital_phone: '108',
      signals: ['severe_crash', 'head_injury'],
    });

    if (res.whatsapp_url) {
      window.open(res.whatsapp_url, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      
      <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900">
                Medical ID &amp; Emergency Vault
              </h3>
              <p className="text-xs text-slate-500">
                Paramedic-ready digital profile and ICE emergency broadcast
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'profile'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Medical Profile
          </button>
          <button
            onClick={() => setActiveTab('contacts')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'contacts'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ICE Contacts ({contacts.length})
          </button>
          <button
            onClick={() => setActiveTab('dispatch')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'dispatch'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Dispatch Broadcast
          </button>
        </div>

        {/* Tab 1: Medical Profile Form */}
        {activeTab === 'profile' && (
          <div className="space-y-4 text-xs sm:text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Blood Group</label>
                <input
                  type="text"
                  value={profile.bloodGroup}
                  onChange={(e) => setProfile({ ...profile, bloodGroup: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-bold text-emergency-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Known Allergies</label>
                <input
                  type="text"
                  value={profile.allergies}
                  onChange={(e) => setProfile({ ...profile, allergies: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Vehicle Registration</label>
                <input
                  type="text"
                  value={profile.vehicleReg}
                  onChange={(e) => setProfile({ ...profile, vehicleReg: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Emergency Notes for First Responders</label>
              <textarea
                rows={2}
                value={profile.emergencyNotes}
                onChange={(e) => setProfile({ ...profile, emergencyNotes: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none resize-none"
              />
            </div>
          </div>
        )}

        {/* Tab 2: ICE Contacts List */}
        {activeTab === 'contacts' && (
          <div className="space-y-3">
            {contacts.map((contact) => (
              <div key={contact.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">{contact.name}</h4>
                  <p className="text-xs text-slate-500">{contact.phone} • {contact.relation}</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  SOS Auto-Notify
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Dispatch Broadcast Preview */}
        {activeTab === 'dispatch' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs font-mono text-slate-700">
              <p className="font-bold text-emergency-600">🚨 [ROADSOS EMERGENCY DISPATCH]</p>
              <p>PATIENT: {profile.name} (Blood: {profile.bloodGroup})</p>
              <p>VEHICLE: {profile.vehicleReg}</p>
              <p>LIVE GPS: https://maps.google.com/?q={userLat.toFixed(4)},{userLon.toFixed(4)}</p>
            </div>

            <button
              onClick={handleShareWhatsApp}
              className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-sm"
            >
              <Share2 className="w-4 h-4" />
              <span>Broadcast via WhatsApp to All ICE Contacts</span>
            </button>
          </div>
        )}

        {/* Footer Close */}
        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition"
          >
            Save &amp; Close Vault
          </button>
        </div>

      </div>

    </div>
  );
};
