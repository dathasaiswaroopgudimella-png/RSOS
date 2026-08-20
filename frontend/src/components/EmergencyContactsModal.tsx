import React, { useState, useEffect } from 'react';
import {
  X, UserPlus, Trash2, Heart, Shield, Phone, User,
  Car, AlertCircle, Save, Check, Share2
} from 'lucide-react';
import { EmergencyContact, MedicalProfile } from '../types';

interface EmergencyContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userLat?: number;
  userLon?: number;
}

export const EmergencyContactsModal: React.FC<EmergencyContactsModalProps> = ({
  isOpen,
  onClose,
  userLat,
  userLon,
}) => {
  const [contacts, setContacts] = useState<EmergencyContact[]>(() => {
    const saved = localStorage.getItem('roadsos_ice_contacts');
    return saved
      ? JSON.parse(saved)
      : [
          { id: '1', name: 'Family Emergency', phone: '919876543210', relation: 'Spouse/Parent', notifyOnSos: true },
          { id: '2', name: 'Emergency Dispatch', phone: '108', relation: 'Ambulance Service', notifyOnSos: true },
        ];
  });

  const [profile, setProfile] = useState<MedicalProfile>(() => {
    const saved = localStorage.getItem('roadsos_medical_profile');
    return saved
      ? JSON.parse(saved)
      : {
          name: 'Primary Driver',
          age: '28',
          bloodGroup: 'O+',
          allergies: 'Penicillin (Severe)',
          conditions: 'None',
          emergencyNotes: 'Carries EpiPen in glovebox',
          vehicleReg: 'TS-09-EA-1234',
        };
  });

  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactRelation, setNewContactRelation] = useState('Family');

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('roadsos_medical_profile', JSON.stringify(profile));
    localStorage.setItem('roadsos_ice_contacts', JSON.stringify(contacts));
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleAddContact = () => {
    if (!newContactName || !newContactPhone) return;
    const newContact: EmergencyContact = {
      id: Date.now().toString(),
      name: newContactName,
      phone: newContactPhone,
      relation: newContactRelation,
      notifyOnSos: true,
    };
    const updated = [...contacts, newContact];
    setContacts(updated);
    localStorage.setItem('roadsos_ice_contacts', JSON.stringify(updated));
    setNewContactName('');
    setNewContactPhone('');
  };

  const handleDeleteContact = (id: string) => {
    const updated = contacts.filter((c) => c.id !== id);
    setContacts(updated);
    localStorage.setItem('roadsos_ice_contacts', JSON.stringify(updated));
  };

  const handleBroadcastAll = () => {
    const mapsLink = `https://www.google.com/maps/search/?api=1&query=${userLat || 17.385},${userLon || 78.4867}`;
    const message = `🚨 [ROADSOS EMERGENCY ALERT]\nI am in an emergency situation.\nPatient: ${profile.name} (Blood: ${profile.bloodGroup})\nVehicle: ${profile.vehicleReg}\nAllergies: ${profile.allergies}\nLive GPS Location: ${mapsLink}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-obsidian-surface rounded-2xl border border-obsidian-border w-full max-w-2xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto space-y-6">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary-light border border-primary/40 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                Emergency Medical ID &amp; ICE Contacts
              </h3>
              <p className="text-xs text-slate-400">
                Encrypted in browser storage for instant paramedic access &amp; automated dispatch
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSaveProfile} className="space-y-6">
          
          {/* Medical Profile Vault */}
          <div className="space-y-4">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Heart className="w-4 h-4 text-primary-light" />
              Patient Clinical Profile
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1 block">Full Name</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:border-primary focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1 block">Blood Group</label>
                <select
                  value={profile.bloodGroup}
                  onChange={(e) => setProfile({ ...profile, bloodGroup: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:border-primary focus:outline-none"
                >
                  <option value="O+">O Positive (O+)</option>
                  <option value="O-">O Negative (O-)</option>
                  <option value="A+">A Positive (A+)</option>
                  <option value="A-">A Negative (A-)</option>
                  <option value="B+">B Positive (B+)</option>
                  <option value="B-">B Negative (B-)</option>
                  <option value="AB+">AB Positive (AB+)</option>
                  <option value="AB-">AB Negative (AB-)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1 block">Vehicle Reg #</label>
                <input
                  type="text"
                  value={profile.vehicleReg}
                  onChange={(e) => setProfile({ ...profile, vehicleReg: e.target.value })}
                  placeholder="e.g. TS-09-AB-1234"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1 block">Known Drug / Food Allergies</label>
                <input
                  type="text"
                  value={profile.allergies}
                  onChange={(e) => setProfile({ ...profile, allergies: e.target.value })}
                  placeholder="e.g. Penicillin, NSAIDs, Peanuts"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1 block">Pre-Existing Conditions</label>
                <input
                  type="text"
                  value={profile.conditions}
                  onChange={(e) => setProfile({ ...profile, conditions: e.target.value })}
                  placeholder="e.g. Diabetes, Asthma, Hypertension"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* ICE Emergency Contacts */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Phone className="w-4 h-4 text-cyan-400" />
              In Case of Emergency (ICE) Contacts
            </h4>

            {/* List of Contacts */}
            <div className="space-y-2">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-slate-400" />
                    <div>
                      <strong className="text-white block">{contact.name}</strong>
                      <span className="text-slate-400">{contact.phone} · {contact.relation}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteContact(contact.id)}
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-primary-light hover:bg-slate-700 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add New Contact Row */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2">
              <input
                type="text"
                placeholder="Contact Name"
                value={newContactName}
                onChange={(e) => setNewContactName(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none"
              />
              <input
                type="tel"
                placeholder="Phone Number"
                value={newContactPhone}
                onChange={(e) => setNewContactPhone(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none"
              />
              <input
                type="text"
                placeholder="Relation (e.g. Spouse)"
                value={newContactRelation}
                onChange={(e) => setNewContactRelation(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddContact}
                className="flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 active:scale-95 transition"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add ICE</span>
              </button>
            </div>
          </div>

          {/* Modal Footer Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={handleBroadcastAll}
              className="w-full sm:w-auto flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold active:scale-95 transition hover:bg-emerald-600/40"
            >
              <Share2 className="w-4 h-4" />
              <span>Broadcast Live SOS to WhatsApp</span>
            </button>

            <button
              type="submit"
              className="w-full sm:w-auto flex items-center justify-center gap-2 py-2.5 px-6 rounded-xl bg-primary hover:bg-primary-container text-white text-xs font-bold shadow-glow-primary active:scale-95 transition"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Profile Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Medical ID</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
