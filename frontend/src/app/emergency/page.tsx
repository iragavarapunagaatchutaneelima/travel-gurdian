"use client";

import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import {
  getTrustedContacts,
  refreshTrustedContactsFromBackend,
  addTrustedContact,
  updateTrustedContact,
  removeTrustedContact,
  toggleContactEnabled,
  MAX_TRUSTED_CONTACTS,
  MIN_TRUSTED_CONTACTS,
  validatePhoneNumber
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
  AlertCircle,
  Info,
  Loader2,
  MessageSquare,
  Send,
  Sparkles,
  RefreshCw,
  Lock,
  Unlock
} from "lucide-react";

export default function EmergencyScreen() {
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [alertMessage, setAlertMessage] = useState<{ text: string; type: "success" | "warning" | "danger" } | null>(null);

  // 112 Safety Lock State (Sections 23, 24, 25, 26: DEACTIVATED by default)
  const [is112Active, setIs112Active] = useState(false);
  const [show112ConfirmModal, setShow112ConfirmModal] = useState(false);
  const [show112CallDialog, setShow112CallDialog] = useState(false);
  
  // Trusted Contact Modal
  const [showContactModal, setShowContactModal] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactRel, setContactRel] = useState("Family");
  const [contactFormError, setContactFormError] = useState<string | null>(null);

  // Synchronization status state (Source of Truth: Backend)
  const [syncStatus, setSyncStatus] = useState<"synced" | "syncing" | "error" | "offline">("syncing");
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

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

  // Load contacts from backend server as the definitive Source of Truth
  const loadContactsFromBackend = async () => {
    setSyncStatus("syncing");
    setSyncMessage("Synchronizing contacts with server...");
    try {
      const mapped = await refreshTrustedContactsFromBackend();
      setContacts(mapped);
      setSyncStatus("synced");
      setSyncMessage("Synced with Server");
    } catch (err: any) {
      console.warn("Backend contacts fetch failed:", err);
      // Offline fallback: load from local cache
      const local = getTrustedContacts();
      setContacts(local);
      setSyncStatus("offline");
      setSyncMessage(err?.detail || err?.message || "Backend offline — Loaded from local cache");
    }
  };

  useEffect(() => {
    loadContactsFromBackend();
    fetchCurrentLocation();
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

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactFormError(null);

    const cleanName = contactName.trim();
    if (!cleanName) {
      setContactFormError("Contact name cannot be blank.");
      return;
    }

    const phoneValidation = validatePhoneNumber(contactPhone);
    if (!phoneValidation.valid) {
      setContactFormError(phoneValidation.error || "Invalid phone number.");
      return;
    }

    setIsActionLoading(true);
    setSyncStatus("syncing");

    if (editingContactId) {
      const existing = contacts.find(c => c.id === editingContactId);
      const backendId = existing?.backendId;

      try {
        if (backendId) {
          // Update the SAME record on backend (avoids duplicate creation)
          const updatedBc = await TravelGuardianAPI.updateEmergencyContact(backendId, {
            name: cleanName,
            phone: phoneValidation.formatted,
            relation: contactRel
          });
          updateTrustedContact(editingContactId, {
            name: updatedBc.name,
            phone: updatedBc.phone,
            relationship: updatedBc.relation,
            backendId: updatedBc.id
          });
        } else {
          // No backend ID yet: create on backend
          const newBc = await TravelGuardianAPI.createEmergencyContact({
            name: cleanName,
            phone: phoneValidation.formatted,
            relation: contactRel,
            is_enabled: true
          });
          updateTrustedContact(editingContactId, {
            name: newBc.name,
            phone: newBc.phone,
            relationship: newBc.relation,
            backendId: newBc.id
          });
        }

        setContacts(getTrustedContacts());
        setSyncStatus("synced");
        setSyncMessage("Synced with Server");
        setAlertMessage({ text: `Updated contact: ${cleanName}`, type: "success" });
        setShowContactModal(false);
      } catch (err: any) {
        setSyncStatus("error");
        setSyncMessage(`Sync error: ${err.detail || err.message}`);
        setContactFormError(err.detail || err.message || "Failed to update contact on server.");
      } finally {
        setIsActionLoading(false);
      }
    } else {
      // Add new contact
      try {
        const newBc = await TravelGuardianAPI.createEmergencyContact({
          name: cleanName,
          phone: phoneValidation.formatted,
          relation: contactRel,
          is_enabled: true
        });

        addTrustedContact({
          name: newBc.name,
          phone: newBc.phone,
          relationship: newBc.relation,
          enabled: newBc.is_enabled,
          backendId: newBc.id
        });

        setContacts(getTrustedContacts());
        setSyncStatus("synced");
        setSyncMessage("Synced with Server");
        setAlertMessage({ text: `Added trusted contact: ${cleanName}`, type: "success" });
        setShowContactModal(false);
      } catch (err: any) {
        setSyncStatus("error");
        setSyncMessage(`Sync error: ${err.detail || err.message}`);
        setContactFormError(err.detail || err.message || "Failed to save contact on server.");
      } finally {
        setIsActionLoading(false);
      }
    }
  };

  const handleDeleteContact = async (id: string, name: string) => {
    const contact = contacts.find(c => c.id === id);
    if (!contact) return;

    setIsActionLoading(true);
    setSyncStatus("syncing");

    try {
      if (contact.backendId) {
        await TravelGuardianAPI.deleteEmergencyContact(contact.backendId);
      }
      removeTrustedContact(id);
      setContacts(getTrustedContacts());
      setSyncStatus("synced");
      setSyncMessage("Synced with Server");
      setAlertMessage({ text: `Removed contact: ${name}`, type: "success" });
    } catch (err: any) {
      setSyncStatus("error");
      setSyncMessage(`Delete sync failed: ${err.detail || err.message}`);
      setAlertMessage({ text: `Failed to delete contact from server: ${err.detail || err.message}`, type: "danger" });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleToggleContact = async (id: string) => {
    const contact = contacts.find(c => c.id === id);
    if (!contact) return;

    const nextEnabled = !contact.enabled;
    setIsActionLoading(true);
    setSyncStatus("syncing");

    try {
      if (contact.backendId) {
        await TravelGuardianAPI.updateEmergencyContact(contact.backendId, {
          is_enabled: nextEnabled
        });
      }
      updateTrustedContact(id, { enabled: nextEnabled });
      setContacts(getTrustedContacts());
      setSyncStatus("synced");
      setSyncMessage("Synced with Server");
      setAlertMessage({ text: `${contact.name} is now ${nextEnabled ? "active" : "disabled"}`, type: "success" });
    } catch (err: any) {
      setSyncStatus("error");
      setSyncMessage(`Status sync failed: ${err.detail || err.message}`);
      setAlertMessage({ text: `Failed to update status on server: ${err.detail || err.message}`, type: "danger" });
    } finally {
      setIsActionLoading(false);
    }
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

      if (res && res.success && res.status === "sent") {
        setSmsStatus("sent");
        setAlertMessage({ text: `SMS alert dispatched to ${primaryContact.name} (${primaryContact.phone}). SID: ${res.sid || 'confirmed'}`, type: "success" });
        setActionStatusText("SMS alert dispatched successfully.");
      } else if (res && res.status === "dry_run") {
        // Dry-run is a deliberate safety gate, not a failure -- shown as a
        // warning, never doubled up with "Emergency communication failed".
        setSmsStatus("failed");
        setAlertMessage({ text: res.safe_message || "DRY RUN: server-side Exotel dispatch is disabled (EXOTEL_DRY_RUN=true). Nothing was actually sent.", type: "warning" });
        setActionStatusText("Dry-run: SMS validated but not sent.");
      } else {
        setSmsStatus("failed");
        // res.safe_message is already a complete, user-facing sentence --
        // it must never be re-wrapped in another "Emergency communication
        // failed:" prefix (that produced a confusing doubled message).
        setAlertMessage({ text: res?.safe_message || "Emergency communication failed. Please dial 112 directly.", type: "danger" });
        setActionStatusText("Emergency communication failed.");
      }
    } catch {
      setSmsStatus("failed");
      setAlertMessage({ text: "Emergency communication failed. Network error. Please dial 112 directly.", type: "danger" });
      setActionStatusText("Emergency communication failed.");
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

      if (res && res.success && res.status === "initiated") {
        setCallStatus("initiated");
        setAlertMessage({ text: `Emergency call connected to ${primaryContact.name} (${primaryContact.phone}). Call SID: ${res.sid || 'confirmed'}`, type: "success" });
        setActionStatusText("Call initiated successfully.");
      } else if (res && res.status === "dry_run") {
        setCallStatus("failed");
        setAlertMessage({ text: res.safe_message || "DRY RUN: server-side Exotel dispatch is disabled (EXOTEL_DRY_RUN=true). Nothing was actually sent.", type: "warning" });
        setActionStatusText("Dry-run: call validated but not placed.");
      } else {
        setCallStatus("failed");
        setAlertMessage({ text: res?.safe_message || "Emergency communication failed. Please dial 112 directly.", type: "danger" });
        setActionStatusText("Emergency communication failed.");
      }
    } catch {
      setCallStatus("failed");
      setAlertMessage({ text: "Emergency communication failed. Network error. Please dial 112 directly.", type: "danger" });
      setActionStatusText("Emergency communication failed.");
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

      if (res && res.success && res.overall_status === "completed") {
        setSmsStatus("sent");
        setCallStatus("initiated");
        setOverallStatus("completed");
        setAlertMessage({ text: `SOS alerts dispatched to ${primaryContact.name} (${primaryContact.phone}).`, type: "success" });
        setActionStatusText("Emergency alerts sent successfully.");
      } else if (res && res.overall_status === "partially_completed") {
        setOverallStatus("partially_completed");
        setAlertMessage({ text: res?.safe_message || "SOS alert partially delivered.", type: "warning" });
        setActionStatusText("Partial delivery completed.");
      } else if (res && res.overall_status === "dry_run") {
        setOverallStatus("failed");
        setAlertMessage({ text: res.safe_message || "DRY RUN: server-side Exotel dispatch is disabled (EXOTEL_DRY_RUN=true). Nothing was actually sent.", type: "warning" });
        setActionStatusText("Dry-run: SOS validated but not sent.");
      } else {
        setOverallStatus("failed");
        setAlertMessage({ text: res?.safe_message || "Emergency communication failed. Please call 112 directly.", type: "danger" });
        setActionStatusText("Emergency communication failed.");
      }
    } catch {
      setSmsStatus("failed");
      setCallStatus("failed");
      setOverallStatus("failed");
      setAlertMessage({ text: "Emergency communication failed. Network error. Please dial 112 directly.", type: "danger" });
      setActionStatusText("Emergency communication failed.");
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
        
        {/* Title Header with Top-Right 112 Safety Lock Control */}
        <div className="w-full max-w-2xl flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4">
          <div className="text-left space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-bold tracking-wider uppercase">
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Emergency Readiness Protocol</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
              Emergency Portal &amp; Guardians
            </h1>
            <p className="text-xs text-(--muted-foreground) leading-relaxed max-w-md">
              Dispatch instant alerts exclusively to your configured guardians, inspect verified GPS telemetry, or access emergency services.
            </p>
          </div>

          {/* 112 Emergency Activation Toggle (Section 23: Small toggle in top-right, Initial State: DEACTIVATED) */}
          <div className="p-3 rounded-2xl bg-surface border border-border shadow-sm flex flex-col items-end gap-1.5 shrink-0 self-end sm:self-auto">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-(--muted-foreground) uppercase">112 Activation</span>
              <button
                type="button"
                id="toggle-112-activation"
                onClick={() => {
                  if (is112Active) {
                    setIs112Active(false);
                    setAlertMessage({ text: "112 emergency calling has been deactivated and locked.", type: "warning" });
                  } else {
                    setShow112ConfirmModal(true);
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black transition-all ${
                  is112Active
                    ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                    : "bg-elevated-surface text-(--muted-foreground) border border-border hover:text-foreground"
                }`}
              >
                {is112Active ? (
                  <>
                    <Unlock className="h-3.5 w-3.5" />
                    <span>112 ACTIVE</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-3.5 w-3.5" />
                    <span>DEACTIVATED</span>
                  </>
                )}
              </button>
            </div>
            <span className="text-[9px] text-(--muted-foreground) font-semibold">
              {is112Active ? "Emergency calling enabled" : "Protected • Locked by default"}
            </span>
          </div>
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
                  <span className={`text-[10px] font-bold ${locationSnapshot ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                    {locationLoading
                      ? "Waiting for location permission..."
                      : locationSnapshot
                        ? "GPS Synchronized"
                        : "Live location unavailable"}
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
              
              {/* 112 SAFETY LOCK PROTECTED CALL BUTTON (Sections 23, 24, 25, 26) */}
              {is112Active ? (
                <button
                  type="button"
                  id="action-112-call-btn"
                  onClick={() => setShow112CallDialog(true)}
                  className="w-full py-4 rounded-2xl text-white font-black text-sm sm:text-base flex items-center justify-center gap-3 bg-linear-to-r from-red-600 to-rose-700 hover:opacity-95 shadow-xl shadow-red-600/30 transition-all active:scale-95 group cursor-pointer"
                >
                  <PhoneCall className="h-5 w-5" />
                  <span>Call Emergency Services — 112</span>
                </button>
              ) : (
                <div 
                  id="locked-112-container"
                  onClick={() => setShow112ConfirmModal(true)}
                  className="w-full py-3.5 px-4 rounded-2xl bg-elevated-surface border-2 border-dashed border-red-500/30 text-(--muted-foreground) flex items-center justify-between gap-3 cursor-pointer hover:border-red-500/50 transition-all"
                  title="Click to activate 112 calling"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-red-500/10 text-red-500">
                      <Lock className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-extrabold text-foreground">112 Emergency Calling (Locked / Disabled)</div>
                      <div className="text-[10px] text-(--muted-foreground)">Activate toggle in top-right to enable direct emergency dialing</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider px-2.5 py-1 rounded-lg bg-red-500/10 shrink-0">
                    LOCKED
                  </span>
                </div>
              )}

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
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-extrabold text-sm sm:text-base text-foreground">Trusted Guardian Contacts</h3>
                  
                  {syncStatus === "synced" && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1">
                      <Check className="h-3 w-3" /> Synced with Server
                    </span>
                  )}
                  {syncStatus === "syncing" && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-(--primary) border border-blue-500/20 inline-flex items-center gap-1 animate-pulse">
                      <Loader2 className="h-3 w-3 animate-spin" /> Syncing...
                    </span>
                  )}
                  {syncStatus === "offline" && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 inline-flex items-center gap-1" title={syncMessage || undefined}>
                      <AlertTriangle className="h-3 w-3" /> Local Cache
                    </span>
                  )}
                  {syncStatus === "error" && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 inline-flex items-center gap-1" title={syncMessage || undefined}>
                      <AlertCircle className="h-3 w-3" /> Sync Failed
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-(--muted-foreground) font-medium block mt-0.5">
                  {contacts.length} of {MAX_TRUSTED_CONTACTS} configured • Emergency alerts dispatch exclusively here
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadContactsFromBackend}
                  disabled={syncStatus === "syncing"}
                  className="p-2 rounded-xl bg-elevated-surface text-(--muted-foreground) hover:text-foreground border border-border transition-colors disabled:opacity-50"
                  title="Re-sync with Server"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${syncStatus === "syncing" ? "animate-spin" : ""}`} />
                </button>
                <button
                  onClick={handleOpenAddContact}
                  disabled={contacts.length >= MAX_TRUSTED_CONTACTS}
                  className="py-2 px-4 rounded-xl text-white text-xs font-bold bg-(--primary) hover:opacity-90 shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Add Contact</span>
                </button>
              </div>
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

      {/* 112 Activation Confirmation Modal (Section 23) */}
      {show112ConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-surface border border-border w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 animate-scaleUp text-left">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2 text-red-600 font-extrabold text-sm uppercase tracking-wide">
                <ShieldAlert className="h-5 w-5" />
                <span>112 Emergency Activation</span>
              </div>
              <button
                type="button"
                onClick={() => setShow112ConfirmModal(false)}
                className="p-1 rounded-xl text-(--muted-foreground) hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-bold text-foreground">
                Are you sure you want to activate 112 emergency calling?
              </p>
              <p className="text-xs text-(--muted-foreground) leading-relaxed">
                Activating this feature enables direct emergency-service calling. Use it only when required.
              </p>
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[11px] font-semibold text-amber-800 dark:text-amber-200">
                Safety Note: In development and test environments, 112 live dispatches are disabled. Never simulate a real emergency dispatch.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                id="cancel-112-activation-btn"
                onClick={() => setShow112ConfirmModal(false)}
                className="px-4 py-2.5 rounded-2xl font-bold text-xs bg-elevated-surface border border-border text-foreground hover:bg-surface transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-activate-112-btn"
                onClick={() => {
                  setIs112Active(true);
                  setShow112ConfirmModal(false);
                  setAlertMessage({ text: "112 Emergency Calling is now ACTIVE.", type: "warning" });
                }}
                className="px-5 py-2.5 rounded-2xl font-black text-xs bg-red-600 text-white shadow-lg shadow-red-600/30 hover:bg-red-700 transition-all cursor-pointer"
              >
                Activate 112
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Final Confirmation Modal before initiating actual 112 Call (Section 24) */}
      {show112CallDialog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-surface border-2 border-red-500 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 animate-scaleUp text-left">
            <div className="flex items-center gap-2 text-red-600 font-extrabold text-sm uppercase">
              <PhoneCall className="h-5 w-5" />
              <span>Confirm Emergency 112 Call</span>
            </div>
            <p className="text-xs text-(--muted-foreground) leading-relaxed">
              You are about to dial India's National Emergency Number (112). This connects directly to official first responders.
            </p>
            <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-[11px] font-semibold text-red-700 dark:text-red-300">
              DEVELOPMENT TEST NOTICE: DO NOT dial 112 during automated or prototype tests.
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                id="dismiss-112-call-btn"
                onClick={() => setShow112CallDialog(false)}
                className="px-4 py-2.5 rounded-2xl font-bold text-xs bg-elevated-surface border border-border text-foreground hover:bg-surface cursor-pointer"
              >
                Cancel
              </button>
              <a
                href="tel:112"
                id="execute-112-call-link"
                onClick={() => setShow112CallDialog(false)}
                className="px-5 py-2.5 rounded-2xl font-black text-xs bg-red-600 text-white hover:bg-red-700 inline-flex items-center gap-2 shadow-lg cursor-pointer"
              >
                <PhoneCall className="h-3.5 w-3.5" />
                <span>Dial 112 Now</span>
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
