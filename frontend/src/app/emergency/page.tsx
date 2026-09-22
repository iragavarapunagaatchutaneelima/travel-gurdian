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
    <div className="min-h-screen pb-20 md:pb-8" style={{ backgroundColor: "#F8FAFC", fontFamily: "'Poppins',sans-serif" }}>
      
      {/* Header */}
      <Header />

      {/* Main Container */}
      <div className="w-full max-w-5xl mx-auto px-4 md:px-8 py-6 space-y-6 flex flex-col items-center animate-slideUp">
        
        {/* Title Header */}
        <div className="text-center max-w-xl space-y-2">
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#EF4444", textTransform: "uppercase", letterSpacing: "0.12em", display: "block" }}>
            Safety &amp; Emergency Readiness
          </span>
          <h2 style={{ fontWeight: 800, fontSize: "clamp(20px,4vw,28px)", color: "#0F172A" }}>
            Emergency Portal &amp; Trusted Contacts
          </h2>
          <p style={{ fontSize: "13px", color: "#64748B", fontWeight: 400, lineHeight: 1.6 }}>
            Configure up to 5 trusted guardians, check GPS telemetry, or directly call emergency services.
          </p>
        </div>

        {/* Global Feedback Banner */}
        {alertMessage && (
          <div
            className="w-full max-w-2xl p-4 rounded-2xl flex items-center justify-between"
            style={{
              backgroundColor: alertMessage.type === "success" ? "#F0FDF4" : alertMessage.type === "danger" ? "#FEF2F2" : "#FFFBEB",
              border: `1px solid ${alertMessage.type === "success" ? "rgba(34,197,94,0.25)" : alertMessage.type === "danger" ? "rgba(239,68,68,0.25)" : "rgba(245,158,11,0.25)"}`,
              color: alertMessage.type === "success" ? "#16A34A" : alertMessage.type === "danger" ? "#DC2626" : "#D97706",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            <div className="flex items-center gap-2">
              {alertMessage.type === "success" ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" /> : <AlertTriangle className="h-4 w-4 flex-shrink-0" />}
              <span>{alertMessage.text}</span>
            </div>
            <button onClick={() => setAlertMessage(null)} className="p-1">✕</button>
          </div>
        )}

        <div className="w-full max-w-2xl space-y-6">

          {/* 1. PRIMARY EMERGENCY DIAL (112) */}
          <div
            className="rounded-3xl p-6 text-center space-y-4"
            style={{ backgroundColor: "#FFFFFF", border: "1.5px solid rgba(239,68,68,0.25)", boxShadow: "0 4px 20px rgba(239,68,68,0.10)" }}
          >
            <div className="flex items-center justify-center gap-2" style={{ fontSize: "11px", fontWeight: 700, color: "#EF4444", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              <ShieldAlert className="h-5 w-5 animate-pulse" />
              <span>National Public Emergency Line (India)</span>
            </div>
            <p style={{ fontSize: "13px", color: "#64748B", fontWeight: 400 }}>
              Tap below to initiate a phone call to national emergency dispatch (Police, Fire, Ambulance).
            </p>
            <a
              href="tel:112"
              className="w-full py-4 rounded-2xl text-white font-bold text-base flex items-center justify-center gap-3 transition-all active:scale-95"
              style={{
                background: "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)",
                boxShadow: "0 6px 24px rgba(239,68,68,0.30)",
                fontFamily: "'Poppins',sans-serif",
                fontWeight: 700,
                fontSize: "16px",
                letterSpacing: "0.04em",
              }}
            >
              <PhoneCall className="h-6 w-6" />
              <span>CALL 112 NOW</span>
            </a>
          </div>

          {/* 2. TRUSTED CONTACTS SECTION */}
          <div
            className="rounded-3xl p-6 space-y-4"
            style={{ backgroundColor: "#FFFFFF", border: "1px solid rgba(15,23,42,0.08)", boxShadow: "0 2px 8px rgba(37,99,255,0.06)" }}
          >
            <div className="flex items-center justify-between pb-3" style={{ borderBottom: "1px solid rgba(15,23,42,0.06)" }}>
              <div>
                <h3 style={{ fontWeight: 700, fontSize: "15px", color: "#0F172A" }}>Trusted Guardian Contacts</h3>
                <span style={{ fontSize: "11px", color: "#64748B", fontWeight: 500, display: "block", marginTop: "2px" }}>
                  {contacts.length} of {MAX_TRUSTED_CONTACTS} contacts configured (Min: {MIN_TRUSTED_CONTACTS})
                </span>
              </div>
              <button
                onClick={handleOpenAddContact}
                disabled={contacts.length >= MAX_TRUSTED_CONTACTS}
                className="py-2 px-4 rounded-xl text-white text-xs flex items-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: "linear-gradient(135deg, #2563FF 0%, #1E40AF 100%)",
                  fontWeight: 600,
                  fontSize: "12px",
                  fontFamily: "'Poppins',sans-serif",
                }}
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
                  className="p-3.5 rounded-2xl flex items-center justify-between transition-all"
                  style={{
                    backgroundColor: contact.enabled ? "#F8FAFC" : "#F1F5F9",
                    border: `1px solid ${contact.enabled ? "rgba(15,23,42,0.07)" : "rgba(15,23,42,0.04)"}`,
                    opacity: contact.enabled ? 1 : 0.65,
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => handleToggleContact(contact.id)}
                      title={contact.enabled ? "Disable contact" : "Enable contact"}
                      className="p-2 rounded-xl border transition-colors"
                      style={{
                        backgroundColor: contact.enabled ? "#DCFCE7" : "#F1F5F9",
                        borderColor: contact.enabled ? "rgba(34,197,94,0.25)" : "rgba(15,23,42,0.08)",
                        color: contact.enabled ? "#16A34A" : "#94A3B8",
                      }}
                    >
                      <Power className="h-4 w-4" />
                    </button>
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <h4 style={{ fontWeight: 700, fontSize: "13px", color: "#0F172A" }} className="truncate">{contact.name}</h4>
                        <span style={{ fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: "9999px", backgroundColor: "#EFF6FF", color: "#2563FF" }}>
                          {contact.relationship || "Contact"}
                        </span>
                      </div>
                      <span style={{ fontSize: "12px", fontFamily: "monospace", color: "#64748B", display: "block", marginTop: "2px" }}>
                        {contact.phone}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                    <button
                      onClick={() => handleOpenEditContact(contact)}
                      className="p-2 rounded-xl transition-colors"
                      style={{ backgroundColor: "#F1F5F9", color: "#64748B" }}
                      title="Edit Contact"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteContact(contact.id, contact.name)}
                      disabled={contacts.length <= MIN_TRUSTED_CONTACTS}
                      className="p-2 rounded-xl transition-colors disabled:opacity-40"
                      style={{ backgroundColor: "#FEF2F2", color: "#EF4444" }}
                      title={contacts.length <= MIN_TRUSTED_CONTACTS ? "At least 1 contact required" : "Delete Contact"}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Test Alert Button */}
            <div className="pt-2" style={{ borderTop: "1px solid rgba(15,23,42,0.06)" }}>
              <button
                onClick={handleAlertContacts}
                className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 transition-all"
                style={{ backgroundColor: "#F8FAFC", border: "1px solid rgba(15,23,42,0.08)", fontSize: "12px", fontWeight: 600, color: "#374151", fontFamily: "'Poppins',sans-serif" }}
                onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = "#EFF6FF"}
                onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = "#F8FAFC"}
              >
                <Phone className="h-3.5 w-3.5" style={{ color: "#2563FF" }} />
                <span>Test Alert Notification to Active Guardians</span>
              </button>
            </div>
          </div>

          {/* 3. LAST KNOWN LOCATION TELEMETRY */}
          <div
            className="rounded-3xl p-6 space-y-3"
            style={{ backgroundColor: "#FFFFFF", border: "1px solid rgba(15,23,42,0.08)", boxShadow: "0 2px 8px rgba(37,99,255,0.06)" }}
          >
            <div className="flex items-center justify-between pb-3" style={{ borderBottom: "1px solid rgba(15,23,42,0.06)" }}>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" style={{ color: "#2563FF" }} />
                <h3 style={{ fontWeight: 700, fontSize: "15px", color: "#0F172A" }}>Current / Last Known Location</h3>
              </div>
              <button
                onClick={fetchCurrentLocation}
                style={{ fontSize: "12px", fontWeight: 600, color: "#2563FF" }}
              >
                Refresh GPS
              </button>
            </div>

            {locationSnapshot ? (
              <div
                className="p-3.5 rounded-2xl space-y-2"
                style={{ backgroundColor: "#F8FAFC", border: "1px solid rgba(15,23,42,0.06)" }}
              >
                <div className="flex items-center justify-between" style={{ fontFamily: "monospace", fontSize: "12px", fontWeight: 600, color: "#0F172A" }}>
                  <span>{locationSnapshot.formattedText}</span>
                  <span style={{ fontSize: "10px", color: "#94A3B8" }}>
                    Recorded {new Date(locationSnapshot.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                </div>
                {locationSnapshot.googleMapsUrl && (
                  <a
                    href={locationSnapshot.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5"
                    style={{ fontSize: "12px", fontWeight: 600, color: "#2563FF" }}
                  >
                    <span>View Coordinates on Google Maps</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            ) : (
              <div style={{ fontSize: "13px", color: "#94A3B8", fontWeight: 400 }}>
                {locationLoading ? "Acquiring GPS coordinates..." : "Location snapshot unavailable. Tap refresh to acquire."}
              </div>
            )}
          </div>

          {/* 4. NOTIFICATION STATUS NOTICE */}
          <div
            className="p-4 rounded-3xl space-y-2"
            style={{ backgroundColor: "#FFFBEB", border: "1px solid rgba(245,158,11,0.2)" }}
          >
            <div className="flex items-center gap-2" style={{ fontWeight: 700, fontSize: "13px", color: "#0F172A" }}>
              <Info className="h-4 w-4 flex-shrink-0" style={{ color: "#F59E0B" }} />
              <span>Notification Truthfulness Notice</span>
            </div>
            <p style={{ fontSize: "12px", color: "#64748B", lineHeight: 1.6 }}>
              Travel Guardian operates with strict anti-fabrication standards. External SMS delivery requires configured provider credentials (Twilio or AWS SNS). In this environment, notification status is truthfully labelled as <strong style={{ color: "#D97706" }}>NOT_CONFIGURED / DEV_SIMULATED</strong>.
            </p>
          </div>

        </div>

      </div>

      {/* ADD / EDIT CONTACT MODAL */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn" style={{ backgroundColor: "rgba(15,23,42,0.5)", backdropFilter: "blur(8px)" }}>
          <div
            className="w-full max-w-md rounded-3xl p-6 text-left space-y-4 animate-slideUp"
            style={{ backgroundColor: "#FFFFFF", boxShadow: "0 24px 64px rgba(15,23,42,0.20)" }}
          >

            <div className="flex items-center justify-between pb-3" style={{ borderBottom: "1px solid rgba(15,23,42,0.08)" }}>
              <h3 style={{ fontWeight: 700, fontSize: "16px", color: "#0F172A" }}>
                {editingContactId ? "Edit Trusted Contact" : "Add Trusted Guardian"}
              </h3>
              <button
                onClick={() => setShowContactModal(false)}
                className="p-1.5 rounded-xl"
                style={{ backgroundColor: "#F1F5F9", color: "#64748B" }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {contactFormError && (
              <div className="flex items-center gap-2 p-3 rounded-xl" style={{ backgroundColor: "#FEF2F2", color: "#DC2626", fontSize: "13px", fontWeight: 600 }}>
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>{contactFormError}</span>
              </div>
            )}

            <form onSubmit={handleSaveContact} className="space-y-3.5">
              {[
                { id: "name", label: "Contact Name", placeholder: "e.g. Mother / John Doe", type: "text", value: contactName, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setContactName(e.target.value) },
                { id: "phone", label: "Phone Number", placeholder: "e.g. +91 98765 43210", type: "tel", value: contactPhone, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setContactPhone(e.target.value) },
              ].map((field) => (
                <div key={field.id} className="space-y-1">
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.08em", display: "block" }}>{field.label}</label>
                  <input
                    type={field.type}
                    required
                    placeholder={field.placeholder}
                    value={field.value}
                    onChange={field.onChange}
                    onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#2563FF"; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 3px rgba(37,99,255,0.12)"; }}
                    onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#E2E8F0"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
                    style={{ width: "100%", borderRadius: "12px", backgroundColor: "#F8FAFC", border: "1.5px solid #E2E8F0", padding: "11px 14px", fontSize: "13px", fontWeight: 500, color: "#0F172A", fontFamily: "'Poppins',sans-serif", outline: "none", transition: "border-color 0.2s, box-shadow 0.2s" }}
                  />
                </div>
              ))}

              <div className="space-y-1">
                <label style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.08em", display: "block" }}>Relationship / Label</label>
                <select
                  value={contactRel}
                  onChange={(e) => setContactRel(e.target.value)}
                  style={{ width: "100%", borderRadius: "12px", backgroundColor: "#F8FAFC", border: "1.5px solid #E2E8F0", padding: "11px 14px", fontSize: "13px", fontWeight: 500, color: "#0F172A", fontFamily: "'Poppins',sans-serif", outline: "none" }}
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
                  className="flex-1 py-3 rounded-2xl transition-all"
                  style={{ backgroundColor: "#F1F5F9", color: "#64748B", fontSize: "13px", fontWeight: 600, fontFamily: "'Poppins',sans-serif" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-2xl text-white transition-all"
                  style={{ background: "linear-gradient(135deg, #2563FF 0%, #1E40AF 100%)", fontSize: "13px", fontWeight: 600, fontFamily: "'Poppins',sans-serif", boxShadow: "0 4px 12px rgba(37,99,255,0.25)" }}
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
