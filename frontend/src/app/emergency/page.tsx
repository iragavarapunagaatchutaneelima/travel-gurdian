"use client";

import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import { 
  getTrustedContacts, 
  addTrustedContact, 
  updateTrustedContact, 
  removeTrustedContact, 
  toggleContactEnabled,
  MAX_TRUSTED_CONTACTS,
  MIN_TRUSTED_CONTACTS
} from "../../services/trustedContactService";
import { TrustedContact, LocationSnapshot } from "../../types/safetyCheckIn";
import { 
  Phone, 
  ShieldPlus, 
  Landmark, 
  PhoneCall, 
  Check, 
  AlertTriangle, 
  ShieldCheck, 
  UserPlus, 
  Trash2, 
  Edit3, 
  Power, 
  ExternalLink, 
  MapPin, 
  ShieldAlert, 
  Radio, 
  X, 
  CheckCircle2,
  Info
} from "lucide-react";

export default function EmergencyScreen() {
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [alertMessage, setAlertMessage] = useState<{ text: string; type: "success" | "warning" | "danger" } | null>(null);
  
  // Trusted Contact Modal
  const [showContactModal, setShowContactModal] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactRel, setContactRel] = useState("Family");
  const [contactFormError, setContactFormError] = useState<string | null>(null);

  // Telemetry Location Snapshot
  const [locationSnapshot, setLocationSnapshot] = useState<LocationSnapshot | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    setContacts(getTrustedContacts());
    fetchCurrentLocation();
  }, []);

  const fetchCurrentLocation = () => {
    if (typeof window !== "undefined" && navigator.geolocation) {
      setLocationLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const acc = Math.round(pos.coords.accuracy || 0);
          setLocationSnapshot({
            latitude: lat,
            longitude: lng,
            accuracy: acc,
            timestamp: pos.timestamp,
            isStale: false,
            googleMapsUrl: `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`,
            formattedText: `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)} (±${acc}m)`
          });
          setLocationLoading(false);
        },
        (err) => {
          console.warn("Could not fetch emergency location", err);
          setLocationLoading(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  };

  const handleOpenAddContact = () => {
    if (contacts.length >= MAX_TRUSTED_CONTACTS) {
      setAlertMessage({
        text: `Maximum ${MAX_TRUSTED_CONTACTS} trusted contacts allowed. Please remove or edit an existing contact.`,
        type: "warning"
      });
      return;
    }
    setEditingContactId(null);
    setContactName("");
    setContactPhone("");
    setContactRel("Family");
    setContactFormError(null);
    setShowContactModal(true);
  };

  const handleOpenEditContact = (contact: TrustedContact) => {
    setEditingContactId(contact.id);
    setContactName(contact.name);
    setContactPhone(contact.phone);
    setContactRel(contact.relationship || "Family");
    setContactFormError(null);
    setShowContactModal(true);
  };

  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    setContactFormError(null);

    if (editingContactId) {
      const res = updateTrustedContact(editingContactId, {
        name: contactName,
        phone: contactPhone,
        relationship: contactRel
      });
      if (!res.success) {
        setContactFormError(res.error || "Failed to update contact.");
        return;
      }
      setAlertMessage({ text: `Updated contact: ${contactName}`, type: "success" });
    } else {
      const res = addTrustedContact({
        name: contactName,
        phone: contactPhone,
        relationship: contactRel,
        enabled: true
      });
      if (!res.success) {
        setContactFormError(res.error || "Failed to add contact.");
        return;
      }
      setAlertMessage({ text: `Added new trusted contact: ${contactName}`, type: "success" });
    }

    setContacts(getTrustedContacts());
    setShowContactModal(false);
  };

  const handleDeleteContact = (id: string, name: string) => {
    const res = removeTrustedContact(id);
    if (!res.success) {
      setAlertMessage({ text: res.error || "Could not delete contact.", type: "danger" });
      return;
    }
    setContacts(getTrustedContacts());
    setAlertMessage({ text: `Removed contact: ${name}`, type: "success" });
  };

  const handleToggleContact = (id: string) => {
    const res = toggleContactEnabled(id);
    if (!res.success) {
      setAlertMessage({ text: res.error || "Could not toggle contact.", type: "warning" });
      return;
    }
    setContacts(getTrustedContacts());
  };

  const handleAlertContacts = () => {
    const active = contacts.filter(c => c.enabled);
    setAlertMessage({
      text: `[DEV_SIMULATED] Alert prepared for ${active.length} contact(s). SMS Gateway status: NOT_CONFIGURED. No real SMS sent without provider credentials.`,
      type: "warning"
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8 flex flex-col items-center transition-colors duration-200">
      
      {/* Header */}
      <Header />

      {/* Main Container */}
      <div className="w-full max-w-5xl px-4 md:px-8 py-6 space-y-6 flex flex-col items-center animate-slideUp">
        
        {/* Title Header */}
        <div className="text-center max-w-xl space-y-2">
          <span className="text-[10px] text-danger font-extrabold uppercase tracking-widest block">
            SAFETY & EMERGENCY READINESS
          </span>
          <h2 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
            Emergency Portal & Trusted Contacts
          </h2>
          <p className="text-xs text-muted font-semibold leading-relaxed">
            Configure up to 5 trusted guardians, check notification gateway telemetry, or directly initiate public emergency services (112).
          </p>
        </div>

        {/* Global Feedback Banner */}
        {alertMessage && (
          <div className={`w-full max-w-2xl p-4 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-md ${
            alertMessage.type === "success" 
              ? "bg-success/10 border-success/30 text-success" 
              : alertMessage.type === "danger"
              ? "bg-danger/10 border-danger/30 text-danger"
              : "bg-warning/10 border-warning/30 text-warning"
          }`}>
            <div className="flex items-center gap-2">
              {alertMessage.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
              <span>{alertMessage.text}</span>
            </div>
            <button onClick={() => setAlertMessage(null)} className="text-xs font-black hover:underline p-1">✕</button>
          </div>
        )}

        <div className="w-full max-w-2xl space-y-6">

          {/* 1. PRIMARY EMERGENCY DIAL (112) */}
          <div className="rounded-3xl border border-danger/40 bg-surface p-6 shadow-lg text-center space-y-3">
            <div className="flex items-center justify-center gap-2 text-danger font-black text-xs uppercase tracking-widest">
              <ShieldAlert className="h-5 w-5 animate-pulse" />
              <span>National Public Emergency Line (India)</span>
            </div>
            <p className="text-xs text-muted font-semibold">
              Tap below to initiate a phone call to national emergency dispatch (Police, Fire, Ambulance).
            </p>
            <a
              href="tel:112"
              className="w-full py-4 rounded-2xl bg-danger hover:opacity-90 text-white font-black text-base tracking-wide flex items-center justify-center gap-3 shadow-xl shadow-danger/25 transition-transform active:scale-98"
            >
              <PhoneCall className="h-6 w-6" />
              <span>CALL 112 NOW</span>
            </a>
          </div>

          {/* 2. TRUSTED CONTACTS SECTION (1 to 5 contacts) */}
          <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-black text-sm text-foreground">Trusted Guardian Contacts</h3>
                <span className="text-[10px] text-muted font-bold block mt-0.5">
                  {contacts.length} of {MAX_TRUSTED_CONTACTS} contacts configured (Min: {MIN_TRUSTED_CONTACTS})
                </span>
              </div>
              <button
                onClick={handleOpenAddContact}
                disabled={contacts.length >= MAX_TRUSTED_CONTACTS}
                className="py-2 px-3 rounded-xl bg-primary-accent hover:bg-primary-accent-hover text-white font-black text-xs flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Add Contact</span>
              </button>
            </div>

            {/* Contact List */}
            <div className="space-y-2.5">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                    contact.enabled 
                      ? "bg-elevated-surface border-border" 
                      : "bg-elevated-surface/50 border-border/60 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => handleToggleContact(contact.id)}
                      title={contact.enabled ? "Disable contact" : "Enable contact"}
                      className={`p-2 rounded-xl border transition-colors ${
                        contact.enabled 
                          ? "bg-success/15 border-success/30 text-success" 
                          : "bg-muted/15 border-border text-muted"
                      }`}
                    >
                      <Power className="h-4 w-4" />
                    </button>
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-xs text-foreground truncate">{contact.name}</h4>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-surface border border-border text-muted">
                          {contact.relationship || "Contact"}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono font-semibold text-muted block mt-0.5">
                        {contact.phone}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <button
                      onClick={() => handleOpenEditContact(contact)}
                      className="p-2 rounded-xl bg-surface hover:bg-border text-muted hover:text-foreground border border-border transition-colors"
                      title="Edit Contact"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteContact(contact.id, contact.name)}
                      disabled={contacts.length <= MIN_TRUSTED_CONTACTS}
                      className="p-2 rounded-xl bg-surface hover:bg-danger/20 text-muted hover:text-danger border border-border transition-colors disabled:opacity-40 disabled:hover:bg-surface disabled:hover:text-muted"
                      title={contacts.length <= MIN_TRUSTED_CONTACTS ? "At least 1 contact required" : "Delete Contact"}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Test Alert Button */}
            <div className="pt-2 border-t border-border">
              <button
                onClick={handleAlertContacts}
                className="w-full py-3 rounded-2xl bg-elevated-surface hover:bg-border text-foreground font-black text-xs border border-border transition-all flex items-center justify-center gap-2"
              >
                <Phone className="h-3.5 w-3.5 text-primary-accent" />
                <span>Test Alert Notification to Active Guardians</span>
              </button>
            </div>
          </div>

          {/* 3. LAST KNOWN LOCATION TELEMETRY */}
          <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary-accent" />
                <h3 className="font-black text-sm text-foreground">Current / Last Known Location</h3>
              </div>
              <button
                onClick={fetchCurrentLocation}
                className="text-[11px] font-black text-primary-accent hover:underline"
              >
                Refresh GPS
              </button>
            </div>

            {locationSnapshot ? (
              <div className="p-3.5 rounded-2xl bg-elevated-surface border border-border space-y-2 text-xs">
                <div className="flex items-center justify-between font-mono font-bold">
                  <span>{locationSnapshot.formattedText}</span>
                  <span className="text-[10px] text-muted font-sans font-semibold">
                    Recorded {new Date(locationSnapshot.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                </div>
                {locationSnapshot.googleMapsUrl && (
                  <a
                    href={locationSnapshot.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-black text-primary-accent hover:underline"
                  >
                    <span>View Coordinates on Google Maps</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            ) : (
              <div className="text-xs text-muted font-semibold">
                {locationLoading ? "Acquiring GPS coordinates..." : "Location snapshot unavailable. Tap refresh to acquire."}
              </div>
            )}
          </div>

          {/* 4. TRUTHFUL NOTIFICATION STATUS NOTICE */}
          <div className="p-4 rounded-3xl bg-elevated-surface border border-border space-y-2 text-xs text-muted">
            <div className="flex items-center gap-2 font-black text-foreground">
              <Info className="h-4 w-4 text-info shrink-0" />
              <span>Notification Truthfulness Notice (Phase 5 Standard)</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Travel Guardian operates with strict anti-fabrication standards. External SMS delivery requires configured provider credentials (Twilio or AWS SNS). In this demo environment, notification status is truthfully labelled as <strong className="text-warning font-black">NOT_CONFIGURED / DEV_SIMULATED</strong>.
            </p>
          </div>

        </div>

      </div>

      {/* ADD / EDIT CONTACT MODAL */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-surface border border-border rounded-3xl p-6 text-left space-y-4 shadow-2xl animate-slideUp">
            
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-black text-base text-foreground">
                {editingContactId ? "Edit Trusted Contact" : "Add Trusted Guardian"}
              </h3>
              <button
                onClick={() => setShowContactModal(false)}
                className="p-1 rounded-lg hover:bg-elevated-surface text-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {contactFormError && (
              <div className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{contactFormError}</span>
              </div>
            )}

            <form onSubmit={handleSaveContact} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-black text-muted uppercase tracking-wider block">
                  Contact Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mother / John Doe"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full rounded-xl bg-elevated-surface border border-border px-3 py-2.5 text-xs font-bold text-foreground focus:outline-none focus:border-primary-accent"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-muted uppercase tracking-wider block">
                  Phone Number
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +91 98765 43210"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full rounded-xl bg-elevated-surface border border-border px-3 py-2.5 text-xs font-bold text-foreground focus:outline-none focus:border-primary-accent"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-muted uppercase tracking-wider block">
                  Relationship / Label
                </label>
                <select
                  value={contactRel}
                  onChange={(e) => setContactRel(e.target.value)}
                  className="w-full rounded-xl bg-elevated-surface border border-border px-3 py-2.5 text-xs font-bold text-foreground focus:outline-none focus:border-primary-accent"
                >
                  <option value="Family">Family</option>
                  <option value="Friend">Friend</option>
                  <option value="Colleague">Colleague</option>
                  <option value="Emergency Contact">Emergency Contact</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowContactModal(false)}
                  className="flex-1 py-3 rounded-2xl bg-elevated-surface hover:bg-border text-muted font-black text-xs transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-2xl bg-primary-accent hover:bg-primary-accent-hover text-white font-black text-xs transition-all shadow-md"
                >
                  Save Contact
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <div className="md:hidden">
        <BottomNav />
      </div>

    </div>
  );
}
