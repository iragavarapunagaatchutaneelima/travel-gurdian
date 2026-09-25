"use client";

import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import { 
  getTrustedContacts, 
  saveTrustedContacts,
  addTrustedContact, 
  updateTrustedContact, 
  removeTrustedContact, 
  toggleContactEnabled,
  MAX_TRUSTED_CONTACTS,
  MIN_TRUSTED_CONTACTS
} from "../../services/trustedContactService";
import { TravelGuardianAPI } from "../../services/api";
import { reverseGeocodeCoordinates } from "../../services/googlePlaces";
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
  Info,
  Loader2,
  MessageSquare,
  Send,
  Sparkles,
  RefreshCw
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

  // Telemetry Location Snapshot (Section 17: Humanized Location)
  const [locationSnapshot, setLocationSnapshot] = useState<LocationSnapshot | null>(null);
  const [humanLocation, setHumanLocation] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  // Exotel Emergency Communication States
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionStatusText, setActionStatusText] = useState<string | null>(null);
  const [smsStatus, setSmsStatus] = useState<"pending" | "sent" | "failed" | null>(null);
  const [callStatus, setCallStatus] = useState<"pending" | "initiated" | "completed" | "failed" | null>(null);
  const [overallStatus, setOverallStatus] = useState<"pending" | "partially_completed" | "completed" | "failed" | null>(null);

  useEffect(() => {
    const local = getTrustedContacts();
    setContacts(local);
    fetchCurrentLocation();

    // Synchronize with backend database contacts if available
    TravelGuardianAPI.getEmergencyContacts()
      .then((backendContacts) => {
        if (backendContacts && backendContacts.length > 0) {
          const mapped: TrustedContact[] = backendContacts.map((bc) => ({
            id: `tc_${bc.id}`,
            name: bc.name,
            phone: bc.phone,
            relationship: bc.relation,
            enabled: true,
            createdAt: Date.now()
          }));
          setContacts(mapped);
          saveTrustedContacts(mapped);
        }
      })
      .catch(() => {});
  }, []);

  // Section 17: Fetch actual GPS and reverse geocode to human-readable address
  const fetchCurrentLocation = () => {
    if (typeof window !== "undefined" && navigator.geolocation) {
      setLocationLoading(true);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const acc = Math.round(pos.coords.accuracy || 0);

          try {
            const locDetails = await reverseGeocodeCoordinates(lat, lng);
            const addressString = locDetails.formattedAddress || locDetails.name;
            setHumanLocation(addressString);
            setLocationSnapshot({
              latitude: lat,
              longitude: lng,
              accuracy: acc,
              timestamp: pos.timestamp,
              isStale: false,
              googleMapsUrl: `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`,
              formattedText: addressString
            });
          } catch {
            setHumanLocation(null);
            setLocationSnapshot({
              latitude: lat,
              longitude: lng,
              accuracy: acc,
              timestamp: pos.timestamp,
              isStale: false,
              googleMapsUrl: `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`,
              formattedText: `Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}`
            });
          } finally {
            setLocationLoading(false);
          }
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
      setAlertMessage({ text: `Added trusted contact: ${contactName}`, type: "success" });
    }

    // Synchronize to backend SQLite database
    TravelGuardianAPI.createEmergencyContact({
      name: contactName,
      phone: contactPhone,
      relation: contactRel
    }).catch(err => console.warn("Backend contact sync notice:", err));

    setContacts(getTrustedContacts());
    setShowContactModal(false);
  };

  const handleDeleteContact = (id: string, name: string) => {
    const res = removeTrustedContact(id);
    if (!res.success) {
      setAlertMessage({ text: res.error || "Could not delete contact.", type: "warning" });
      return;
    }
    setContacts(getTrustedContacts());
    setAlertMessage({ text: `Removed contact: ${name}`, type: "success" });
  };

  const handleToggleContact = (id: string) => {
    toggleContactEnabled(id);
    setContacts(getTrustedContacts());
  };

  // Section 18: Destination must strictly resolve from the stored Trusted Contact
  const activeContacts = contacts.filter(c => c.enabled);
  const primaryContact = activeContacts.length > 0 ? activeContacts[0] : null;

  // Exotel SMS Alert to Configured Contact
  const handleAlertTrustedContactSMS = async () => {
    if (!primaryContact) {
      setAlertMessage({ text: "Please add a trusted contact before sending an alert.", type: "warning" });
      return;
    }

    setIsActionLoading(true);
    setActionStatusText(`Sending SMS alert to ${primaryContact.name} via Exotel...`);
    setSmsStatus("pending");

    try {
      const res = await TravelGuardianAPI.sendEmergencySMS({
        latitude: locationSnapshot?.latitude,
        longitude: locationSnapshot?.longitude,
        location_name: humanLocation || "Current GPS Location",
        custom_message: "EMERGENCY: User requested immediate assistance via Travel Guardian.",
        contact_name: primaryContact.name,
        contact_phone: primaryContact.phone,
        contact_relation: primaryContact.relationship
      });

      if (res && (res.status === "sent" || (res as any).status === "success" || res.success)) {
        setSmsStatus("sent");
        setAlertMessage({ text: `SMS alert dispatched to ${primaryContact.name} (${primaryContact.phone}).`, type: "success" });
        setActionStatusText("SMS alert dispatched successfully.");
      } else {
        setSmsStatus("failed");
        setAlertMessage({ text: res?.safe_message || "Exotel SMS alert could not be delivered. Please use voice dialer.", type: "warning" });
        setActionStatusText("SMS dispatch failed.");
      }
    } catch {
      setSmsStatus("failed");
      setAlertMessage({ text: "SMS dispatch network error.", type: "danger" });
      setActionStatusText("SMS dispatch failed.");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Exotel Voice Call to Configured Contact
  const handleCallTrustedContact = async () => {
    if (!primaryContact) {
      setAlertMessage({ text: "Please add a trusted contact before making an emergency call.", type: "warning" });
      return;
    }

    setIsActionLoading(true);
    setActionStatusText(`Initiating emergency call to ${primaryContact.name} via Exotel...`);
    setCallStatus("pending");

    try {
      const res = await TravelGuardianAPI.makeEmergencyCall({
        latitude: locationSnapshot?.latitude,
        longitude: locationSnapshot?.longitude,
        location_name: humanLocation || "Current GPS Location",
        voice_message: "Emergency alert from Travel Guardian. Your contact has requested assistance.",
        contact_name: primaryContact.name,
        contact_phone: primaryContact.phone,
        contact_relation: primaryContact.relationship
      });

      if (res && (res.status === "initiated" || (res as any).status === "completed" || res.success)) {
        setCallStatus("initiated");
        setAlertMessage({ text: `Emergency call connected to ${primaryContact.name} (${primaryContact.phone}).`, type: "success" });
        setActionStatusText("Call initiated successfully.");
      } else {
        setCallStatus("failed");
        setAlertMessage({ text: res?.safe_message || "Unable to initiate Exotel call. Please dial directly.", type: "warning" });
        setActionStatusText("Call initiation failed.");
      }
    } catch {
      setCallStatus("failed");
      setAlertMessage({ text: "Voice call network error.", type: "danger" });
      setActionStatusText("Call initiation failed.");
    } finally {
      setIsActionLoading(false);
    }
  };

  // SOS Broadcast to Configured Contact
  const handleTriggerSOS = async () => {
    if (!primaryContact) {
      setAlertMessage({ text: "Please add a trusted contact before triggering SOS broadcast.", type: "warning" });
      return;
    }

    setIsActionLoading(true);
    setActionStatusText(`Broadcasting SOS alert to ${primaryContact.name}...`);
    setOverallStatus("pending");

    try {
      const res = await TravelGuardianAPI.notifyTrustedContact({
        latitude: locationSnapshot?.latitude,
        longitude: locationSnapshot?.longitude,
        location_name: humanLocation || "Current GPS Location",
        include_sms: true,
        include_call: true,
        contact_name: primaryContact.name,
        contact_phone: primaryContact.phone,
        contact_relation: primaryContact.relationship
      });

      if (res && (res.overall_status === "completed" || (res as any).status === "success" || res.success)) {
        setSmsStatus("sent");
        setCallStatus("completed");
        setOverallStatus("completed");
        setAlertMessage({ text: `SOS alerts dispatched to ${primaryContact.name} (${primaryContact.phone}).`, type: "success" });
        setActionStatusText("Emergency alerts sent successfully.");
      } else if (res && res.overall_status === "partially_completed") {
        setOverallStatus("partially_completed");
        setAlertMessage({ text: res?.safe_message || "SOS alert partially delivered.", type: "warning" });
        setActionStatusText("Partial delivery completed.");
      } else {
        setOverallStatus("failed");
        setAlertMessage({ text: res?.safe_message || "Unable to contact trusted person via Exotel.", type: "danger" });
        setActionStatusText("Unable to contact trusted person.");
      }
    } catch {
      setSmsStatus("failed");
      setCallStatus("failed");
      setOverallStatus("failed");
      setAlertMessage({ text: "Unable to contact trusted person.", type: "danger" });

      setActionStatusText("Unable to contact trusted person.");
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen pb-20 md:pb-8 bg-background text-foreground"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <Header />

      <div className="w-full max-w-5xl mx-auto px-4 md:px-8 py-6 space-y-6 flex flex-col items-center animate-slideUp">
        
        {/* Title Header */}
        <div className="text-center max-w-xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-bold tracking-wider uppercase">
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>Emergency Readiness Protocol</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
            Emergency Portal &amp; Trusted Guardians
          </h1>
          <p className="text-xs md:text-sm text-(--muted-foreground) leading-relaxed">
            Dispatch instant alerts to your configured guardians, inspect verified GPS location telemetry, or directly dial 112 emergency services.
          </p>
        </div>

        {/* Global Feedback Banner */}
        {alertMessage && (
          <div
            className={`w-full max-w-2xl p-4 rounded-2xl flex items-center justify-between text-xs md:text-sm font-semibold shadow-md animate-slideDown ${
              alertMessage.type === "success" 
                ? "bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200" 
                : alertMessage.type === "danger" 
                ? "bg-red-50 dark:bg-red-950/80 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-200" 
                : "bg-amber-50 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {alertMessage.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
              <span>{alertMessage.text}</span>
            </div>
            <button onClick={() => setAlertMessage(null)} className="p-1 hover:opacity-70">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="w-full max-w-2xl space-y-6">

          {/* ============================================================
              CURRENT LOCATION & TELEMETRY (Section 17: Humanized Address)
              ============================================================ */}
          <div className="rounded-3xl p-6 bg-surface border border-border shadow-xl text-left space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-(--primary)/10 text-(--primary)">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-xs uppercase tracking-wider text-(--muted-foreground)">
                    Current Location Telemetry
                  </h3>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                    GPS Synchronized
                  </span>
                </div>
              </div>
              <button
                onClick={fetchCurrentLocation}
                disabled={locationLoading}
                className="p-2 rounded-xl bg-elevated-surface text-(--muted-foreground) hover:text-foreground border border-border transition-colors disabled:opacity-50 flex items-center gap-1 text-xs font-semibold"
                title="Refresh GPS Location"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${locationLoading ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>

            {locationSnapshot ? (
              <div className="space-y-1.5">
                <div className="flex items-start gap-2">
                  <div>
                    <h4 className="font-extrabold text-sm sm:text-base text-foreground">
                      {humanLocation || "Location Coordinates"}
                    </h4>
                    <p className="text-xs font-mono text-(--muted-foreground) mt-0.5">
                      {locationSnapshot.latitude.toFixed(6)}, {locationSnapshot.longitude.toFixed(6)}
                      <span className="ml-2 font-sans font-medium text-[11px]">
                        (Accuracy: ±{locationSnapshot.accuracy}m)
                      </span>
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <a
                    href={locationSnapshot.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-(--primary) hover:underline"
                  >
                    <span>View on Google Maps</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <span className="text-[10px] text-(--muted-foreground)">
                    Updated: {new Date(locationSnapshot.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-3 text-center text-xs text-(--muted-foreground)">
                {locationLoading ? "Detecting real-time GPS location..." : "Location unavailable. Please enable browser location permissions."}
              </div>
            )}
          </div>

          {/* ============================================================
              1. EMERGENCY ACTION CENTER
              ============================================================ */}
          <div className="rounded-3xl p-6 space-y-5 bg-surface border-2 border-red-500/30 shadow-xl text-left">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2 text-red-600 font-extrabold text-xs uppercase tracking-wider">
                <ShieldAlert className="h-5 w-5 animate-pulse" />
                <span>Emergency Action Center</span>
              </div>
              {primaryContact ? (
                <span className="text-xs font-semibold text-(--muted-foreground)">
                  Target: <strong className="text-foreground">{primaryContact.name}</strong> ({primaryContact.relationship || "Guardian"})
                </span>
              ) : (
                <span className="text-xs font-bold text-red-500">
                  No active trusted contact configured
                </span>
              )}
            </div>

            {/* In-Flight Status Text */}
            {isActionLoading && (
              <div className="p-3 rounded-2xl flex items-center justify-center gap-2 bg-blue-500/10 text-(--primary) text-xs font-bold animate-pulse">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{actionStatusText || "Processing emergency request..."}</span>
              </div>
            )}

            {/* Action Buttons Grid */}
            <div className="space-y-3">
              
              {/* PRIMARY EMERGENCY DIAL (112) - OFFICIAL 112 ONLY */}
              <a
                href="tel:112"
                className="w-full py-4 rounded-2xl text-white font-black text-sm sm:text-base flex items-center justify-center gap-3 bg-linear-to-r from-red-600 to-rose-700 hover:opacity-95 shadow-xl shadow-red-600/30 transition-all active:scale-95 group"
              >
                <PhoneCall className="h-5 w-5 group-hover:animate-bounce" />
                <span>Call Emergency Services — 112</span>
              </a>

              {/* SOS Broadcast to Configured Contact Only (SMS + Call) */}
              <button
                onClick={handleTriggerSOS}
                disabled={isActionLoading || !primaryContact}
                className="w-full py-3.5 rounded-2xl text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2.5 bg-linear-to-r from-rose-700 to-red-800 hover:opacity-95 shadow-lg shadow-red-700/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4 animate-pulse" />}
                <span>SOS — Broadcast to Configured Contact (SMS + Call)</span>
              </button>

              {/* 2-Column Actions: SMS & Call to Configured Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  onClick={handleAlertTrustedContactSMS}
                  disabled={isActionLoading || !primaryContact}
                  className="py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 bg-(--primary)/10 border border-(--primary)/30 text-(--primary) hover:bg-(--primary)/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Alert Contact (SMS)</span>
                </button>

                <button
                  onClick={handleCallTrustedContact}
                  disabled={isActionLoading || !primaryContact}
                  className="py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Phone className="h-3.5 w-3.5" />
                  <span>Call Contact (Voice)</span>
                </button>
              </div>

            </div>

            {/* Status Badges Section */}
            {(smsStatus || callStatus || overallStatus) && (
              <div className="pt-3 flex flex-wrap items-center gap-2 border-t border-border">
                <span className="text-[11px] font-bold text-(--muted-foreground) uppercase">Dispatch Status:</span>
                
                {smsStatus && (
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                    smsStatus === "sent" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                    smsStatus === "failed" ? "bg-red-500/10 text-red-600 dark:text-red-400" : "bg-amber-500/10 text-amber-600"
                  }`}>
                    SMS: {smsStatus.toUpperCase()}
                  </span>
                )}

                {callStatus && (
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                    callStatus === "initiated" || callStatus === "completed" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                    callStatus === "failed" ? "bg-red-500/10 text-red-600 dark:text-red-400" : "bg-amber-500/10 text-amber-600"
                  }`}>
                    Call: {callStatus.toUpperCase()}
                  </span>
                )}
              </div>
            )}

            {!primaryContact && (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
                <p className="text-xs text-amber-800 dark:text-amber-300 font-semibold">
                  No trusted emergency guardian configured. Please configure your guardian contact below to enable instant dispatch.
                </p>
              </div>
            )}

          </div>

          {/* ============================================================
              2. CONFIGURED TRUSTED GUARDIANS (Section 18 & 19: High Contrast)
              ============================================================ */}
          <div className="rounded-3xl p-6 space-y-4 bg-surface border border-border shadow-xl text-left">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-foreground">Trusted Guardian Contacts</h3>
                <span className="text-[11px] text-(--muted-foreground) font-medium block mt-0.5">
                  {contacts.length} of {MAX_TRUSTED_CONTACTS} configured • Emergency alerts dispatch exclusively here
                </span>
              </div>
              <button
                onClick={handleOpenAddContact}
                disabled={contacts.length >= MAX_TRUSTED_CONTACTS}
                className="py-2 px-4 rounded-xl text-white text-xs font-bold bg-(--primary) hover:opacity-90 shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Add Contact</span>
              </button>
            </div>

            {/* Contact List */}
            {contacts.length > 0 ? (
              <div className="space-y-2.5">
                {contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className={`p-3.5 rounded-2xl flex items-center justify-between border transition-all ${
                      contact.enabled 
                        ? "bg-elevated-surface border-border" 
                        : "bg-surface border-(--border)/50 opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        onClick={() => handleToggleContact(contact.id)}
                        title={contact.enabled ? "Disable contact" : "Enable contact"}
                        className={`p-2 rounded-xl border transition-colors ${
                          contact.enabled 
                            ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400" 
                            : "bg-surface border-border text-(--muted-foreground)"
                        }`}
                      >
                        <Power className="h-4 w-4" />
                      </button>
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-xs sm:text-sm text-foreground truncate">{contact.name}</h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-(--primary)/10 text-(--primary)">
                            {contact.relationship || "Guardian"}
                          </span>
                        </div>
                        <span className="text-xs font-mono text-(--muted-foreground) block mt-0.5">
                          {contact.phone}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <button
                        onClick={() => handleOpenEditContact(contact)}
                        className="p-2 rounded-xl bg-surface text-(--muted-foreground) hover:text-foreground border border-border transition-colors"
                        title="Edit Contact"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteContact(contact.id, contact.name)}
                        className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 transition-colors"
                        title="Delete Contact"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-(--muted-foreground) space-y-2">
                <p>No trusted guardian contacts added yet.</p>
                <button
                  onClick={handleOpenAddContact}
                  className="px-4 py-2 rounded-xl bg-(--primary) text-white text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Configure Guardian Contact</span>
                </button>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Add / Edit Contact Modal */}
      {showContactModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
          style={{ fontFamily: "'Poppins', sans-serif" }}
        >
          <div className="w-full max-w-md rounded-3xl p-6 text-left space-y-4 shadow-2xl bg-surface border border-border animate-slideUp">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-extrabold text-sm sm:text-base text-foreground">
                {editingContactId ? "Edit Trusted Guardian" : "Add Trusted Guardian"}
              </h3>
              <button 
                onClick={() => setShowContactModal(false)}
                className="p-1.5 rounded-lg text-(--muted-foreground) hover:bg-elevated-surface"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {contactFormError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-semibold">
                {contactFormError}
              </div>
            )}

            <form onSubmit={handleSaveContact} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-(--muted-foreground) uppercase tracking-wider block">
                  Contact Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Priya Sharma / Family Guardian"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full p-3 rounded-xl bg-elevated-surface border border-border text-xs text-foreground outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-(--muted-foreground) uppercase tracking-wider block">
                  Mobile Phone Number
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full p-3 rounded-xl bg-elevated-surface border border-border text-xs text-foreground outline-none font-mono"
                />
                <span className="text-[10px] text-(--muted-foreground) block">
                  Include country code (e.g. +91 for India).
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-(--muted-foreground) uppercase tracking-wider block">
                  Relationship
                </label>
                <select
                  value={contactRel}
                  onChange={(e) => setContactRel(e.target.value)}
                  className="w-full p-3 rounded-xl bg-elevated-surface border border-border text-xs text-foreground outline-none"
                >
                  <option value="Family">Family Member / Parent / Spouse</option>
                  <option value="Friend">Close Friend / Companion</option>
                  <option value="Colleague">Colleague / Work</option>
                  <option value="Emergency Contact">Other Emergency Contact</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowContactModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-(--muted-foreground) hover:bg-elevated-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-(--primary) text-white text-xs font-extrabold shadow-md hover:opacity-90"
                >
                  {editingContactId ? "Save Changes" : "Save Guardian"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
