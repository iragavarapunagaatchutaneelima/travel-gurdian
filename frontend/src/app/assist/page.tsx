"use client";

import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import { TravelGuardianAPI } from "../../services/api";
import { type EmergencyContactResponse, type SafeCheckInResponse } from "../../types/api";
import { 
  Bot, Clock, AlertTriangle, ShieldCheck, UserPlus, 
  Trash2, Send, Loader, Sparkles, Phone, CheckCircle2, ShieldAlert
} from "lucide-react";

interface ChatMessage {
  sender: "user" | "bot";
  text: string;
}

export default function AssistHub() {
  const [contacts, setContacts] = useState<EmergencyContactResponse[]>([]);
  const [checkins, setCheckins] = useState<SafeCheckInResponse[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingCheckin, setLoadingCheckin] = useState(true);

  // Contact Form State
  const [cName, setCName] = useState("");
  const [cPhone, setCPhone] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cRelation, setCRelation] = useState("Spouse/Partner");

  // Timer Form State
  const [timerDuration, setTimerDuration] = useState("2");
  const [checkinNote, setCheckinNote] = useState("");
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [timerIntervalId, setTimerIntervalId] = useState<any>(null);
  const [timerTriggered, setTimerTriggered] = useState(false);

  // Chatbot State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { sender: "bot", text: "Namaste! I am your AI Guardian safety companion powered by contextual risk intelligence. Ask me about route risks (e.g. Chennai to Bangalore), emergency protocols, or solo travel advice." }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [aiMode, setAiMode] = useState<"CONNECTED" | "DEMO">("DEMO");

  async function loadContacts() {
    setLoadingContacts(true);
    try {
      const data = await TravelGuardianAPI.getEmergencyContacts();
      setContacts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingContacts(false);
    }
  }

  async function loadCheckins() {
    setLoadingCheckin(true);
    try {
      const data = await TravelGuardianAPI.getCheckins();
      setCheckins(data);
      if (data.length > 0) {
        initCheckinTimer(data[0].target_time);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCheckin(false);
    }
  }

  useEffect(() => {
    loadContacts();
    loadCheckins();
    return () => {
      if (timerIntervalId) clearInterval(timerIntervalId);
    };
  }, []);

  const initCheckinTimer = (targetTimeStr: string) => {
    if (timerIntervalId) clearInterval(timerIntervalId);
    const targetDate = new Date(targetTimeStr).getTime();
    
    const updateTimer = () => {
      const now = new Date().getTime();
      const diff = Math.max(0, Math.floor((targetDate - now) / 1000));
      setTimeRemaining(diff);
      if (diff === 0) {
        setTimerTriggered(true);
        if (timerIntervalId) clearInterval(timerIntervalId);
      }
    };

    updateTimer();
    const id = setInterval(updateTimer, 1000);
    setTimerIntervalId(id);
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cName || !cPhone) return;

    try {
      await TravelGuardianAPI.createEmergencyContact({
        name: cName,
        phone: cPhone,
        email: cEmail || null,
        relation: cRelation
      });
      setCName("");
      setCPhone("");
      setCEmail("");
      loadContacts();
    } catch (err) {
      alert("Failed to save contact.");
    }
  };

  const handleDeleteContact = async (id: number) => {
    try {
      await TravelGuardianAPI.deleteEmergencyContact(id);
      loadContacts();
    } catch (err) {
      alert("Failed to delete contact.");
    }
  };

  const handleStartTimer = async (e: React.FormEvent) => {
    e.preventDefault();
    setTimerTriggered(false);
    const durationMin = parseFloat(timerDuration) * 60;
    const targetDate = new Date(Date.now() + durationMin * 60 * 1000);

    try {
      const res = await TravelGuardianAPI.setCheckin(targetDate.toISOString(), checkinNote);
      setCheckins([res]);
      initCheckinTimer(res.target_time);
      setCheckinNote("");
    } catch (err) {
      alert("Failed to start timer.");
    }
  };

  const handleCancelTimer = async () => {
    try {
      await TravelGuardianAPI.confirmCheckin();
    } catch {
      // ignore
    }
    setCheckins([]);
    setTimeRemaining(null);
    setTimerTriggered(false);
    if (timerIntervalId) clearInterval(timerIntervalId);
    alert("Check-in confirmed! You are marked safe.");
  };

  const formatTime = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput.trim();
    setChatMessages(prev => [...prev, { sender: "user", text: userMsg }]);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userMsg })
      });
      if (res.ok) {
        const data = await res.json();
        setChatMessages(prev => [...prev, { sender: "bot", text: data.reply }]);
        if (data.mode) setAiMode(data.mode);
      } else {
        throw new Error("AI call failed");
      }
    } catch {
      let reply = "AI Guardian Advisory: All highway corridors are continuously monitored. For women solo travelers, prefer daytime transit and verified fuel plazas along National Highways.";
      const lower = userMsg.toLowerCase();
      if (lower.includes("chennai") || lower.includes("bangalore")) {
        reply = "AI Route Diagnostic (Chennai ➔ Bangalore): 350 km via NH 48. High density of 24/7 fuel plazas and highway food courts. Safety Score: 94/100 (Highly Recommended).";
      } else if (lower.includes("mumbai") || lower.includes("hyderabad")) {
        reply = "AI Route Diagnostic (Mumbai ➔ Hyderabad): 710 km via NH 65. Pune-Solapur expressway segment is fast and well-lit. Solapur-Hyderabad has moderate traffic. Night travel safety score: 86/100.";
      }
      setChatMessages(prev => [...prev, { sender: "bot", text: reply }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8 flex flex-col items-center transition-colors duration-200">
      <Header />

      <div className="w-full max-w-7xl px-4 md:px-8 py-6 space-y-6 text-left animate-slideUp">
        
        {/* Header */}
        <div className="border-b border-border pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-black text-primary-accent uppercase tracking-widest block">
              AI GUARDIAN & ASSIST HUB
            </span>
            <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight mt-1">
              AI Guardian Safety Advisor
            </h1>
            <p className="text-xs text-muted font-semibold mt-0.5">
              Query virtual safety models, schedule fail-safe check-in timers, and configure emergency contacts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-full border ${
              aiMode === "CONNECTED" 
                ? "bg-success/10 border-success/30 text-success" 
                : "bg-elevated-surface border-border text-muted"
            }`}>
              INTELLIGENCE MODE: {aiMode === "CONNECTED" ? "CONNECTED (GEMINI)" : "DEMO / RULES ENGINE"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* AI Guardian Interactive Chat Window */}
          <div className="lg:col-span-6 space-y-6">
            <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm flex flex-col justify-between min-h-[500px] transition-colors">
              <div>
                <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-primary-accent/10 text-primary-accent">
                      <Bot className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-foreground">AI GuardBot Assistant</h3>
                      <p className="text-[9px] text-success font-black uppercase">Active Threat Telemetry Linked</p>
                    </div>
                  </div>
                  <Sparkles className="h-4 w-4 text-primary-accent animate-pulse" />
                </div>

                {/* Message Flow */}
                <div className="space-y-3.5 h-[340px] overflow-y-auto pr-2 flex flex-col mb-4">
                  {chatMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`rounded-2xl p-4 max-w-[85%] text-xs font-semibold leading-relaxed ${
                        msg.sender === "user"
                          ? "bg-primary-accent text-white ml-auto shadow-sm"
                          : "bg-elevated-surface text-foreground mr-auto border border-border"
                      }`}
                    >
                      {msg.text}
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="bg-elevated-surface text-muted border border-border mr-auto rounded-2xl p-3.5 flex items-center gap-2 text-xs">
                      <Loader className="h-4 w-4 animate-spin text-primary-accent" />
                      <span>AI Guardian is analyzing route safety feeds...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Input Form */}
              <form onSubmit={handleSendMessage} className="flex gap-2 pt-2 border-t border-border">
                <input
                  type="text"
                  placeholder="Ask e.g. 'Chennai to Bangalore safety', 'women solo guide', '112 SOS'..."
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  className="flex-1 rounded-2xl bg-elevated-surface border border-border px-4 py-3 text-xs text-foreground font-bold focus:outline-none focus:border-primary-accent"
                  disabled={chatLoading}
                />
                <button
                  type="submit"
                  className="rounded-2xl bg-primary-accent hover:bg-primary-accent-hover p-3 text-white transition-colors shadow-md disabled:opacity-50"
                  disabled={chatLoading}
                >
                  <Send className="h-4.5 w-4.5" />
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Dead-man timer & Emergency contacts */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* Safe Check-In Timer */}
            <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm space-y-4 transition-colors">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <div className="p-2 rounded-xl bg-info/10 text-info">
                  <Clock className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-foreground uppercase tracking-wider">
                    Dead Man's Safe Check-In Timer
                  </h3>
                  <p className="text-[9px] text-muted font-bold">Auto SOS if check-in is unconfirmed</p>
                </div>
              </div>

              {timeRemaining !== null ? (
                <div className="space-y-4 text-center py-4">
                  <div className={`mx-auto flex h-28 w-28 flex-col items-center justify-center rounded-full border-4 ${
                    timerTriggered ? "border-danger bg-danger/10 text-danger" : "border-info bg-info/10 text-info"
                  }`}>
                    <span className="text-xl font-black">{formatTime(timeRemaining)}</span>
                    <span className="text-[8px] font-bold text-muted mt-0.5 uppercase">REMAINING</span>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-extrabold text-foreground text-xs">
                      {timerTriggered ? "CRITICAL: TIMER EXPIRED" : "Fail-Safe Window Active"}
                    </h4>
                    <p className="text-[11px] text-muted px-4 leading-relaxed">
                      {timerTriggered 
                        ? "Check-in expired! Emergency telemetry broadcast dispatched to guardians."
                        : "Verify your safety before the countdown expires to prevent guardian alert dispatch."}
                    </p>
                  </div>

                  <button
                    onClick={handleCancelTimer}
                    className="w-full rounded-2xl bg-success hover:opacity-90 py-3 text-xs font-black text-white transition-all shadow-md"
                  >
                    CONFIRM CHECK-IN (I AM SAFE)
                  </button>
                </div>
              ) : (
                <form onSubmit={handleStartTimer} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-muted uppercase">Duration</label>
                      <select
                        value={timerDuration}
                        onChange={e => setTimerDuration(e.target.value)}
                        className="w-full rounded-xl bg-elevated-surface border border-border px-3 py-2 text-xs text-foreground font-bold focus:outline-none"
                      >
                        <option value="0.05">3 Minutes (Demo mode)</option>
                        <option value="1">1 Hour (Local Transit)</option>
                        <option value="3">3 Hours (Intercity Highway)</option>
                        <option value="6">6 Hours (Night Transit)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-muted uppercase">Transit Note</label>
                      <input
                        type="text"
                        placeholder="e.g. NH 48 corridor transit"
                        value={checkinNote}
                        onChange={e => setCheckinNote(e.target.value)}
                        className="w-full rounded-xl bg-elevated-surface border border-border px-3 py-2 text-xs text-foreground font-bold focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-xl bg-primary-accent hover:bg-primary-accent-hover py-3 text-xs font-black text-white transition-all shadow-md"
                  >
                    START FAIL-SAFE TIMER
                  </button>
                </form>
              )}
            </div>

            {/* Guardian Contacts Registry */}
            <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm space-y-4 transition-colors">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-danger/10 text-danger">
                    <UserPlus className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-foreground uppercase tracking-wider">
                      Emergency Contacts Registry
                    </h3>
                    <p className="text-[9px] text-muted font-bold">Recipients of SOS telemetry broadcasts</p>
                  </div>
                </div>
              </div>

              {/* Add form */}
              <form onSubmit={handleAddContact} className="space-y-2.5 bg-elevated-surface p-3.5 rounded-2xl border border-border">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Contact Name"
                    value={cName}
                    onChange={e => setCName(e.target.value)}
                    className="rounded-xl bg-surface border border-border px-3 py-2 text-xs text-foreground font-bold focus:outline-none"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Phone Number (+91...)"
                    value={cPhone}
                    onChange={e => setCPhone(e.target.value)}
                    className="rounded-xl bg-surface border border-border px-3 py-2 text-xs text-foreground font-bold focus:outline-none"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="email"
                    placeholder="Email (Optional)"
                    value={cEmail}
                    onChange={e => setCEmail(e.target.value)}
                    className="col-span-2 rounded-xl bg-surface border border-border px-3 py-2 text-xs text-foreground font-bold focus:outline-none"
                  />
                  <select
                    value={cRelation}
                    onChange={e => setCRelation(e.target.value)}
                    className="rounded-xl bg-surface border border-border px-2 py-2 text-[10px] text-foreground focus:outline-none font-bold"
                  >
                    <option value="Family">Family</option>
                    <option value="Spouse/Partner">Partner</option>
                    <option value="Friend">Friend</option>
                    <option value="Emergency Node">Guardian</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-primary-accent/10 hover:bg-primary-accent/20 border border-primary-accent/30 py-2 text-xs font-black text-primary-accent transition-colors"
                >
                  + Add Emergency Contact
                </button>
              </form>

              {/* List */}
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                {contacts.length === 0 ? (
                  <p className="text-xs text-muted text-center py-4 font-semibold">
                    No contacts registered yet. Add at least one contact for SOS telemetry.
                  </p>
                ) : (
                  contacts.map(c => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded-xl bg-elevated-surface p-3 border border-border"
                    >
                      <div>
                        <h4 className="font-extrabold text-foreground text-xs">{c.name}</h4>
                        <p className="text-[9px] text-muted font-bold mt-0.5 uppercase">
                          {c.relation} • {c.phone}
                        </p>
                      </div>
                      
                      <button
                        onClick={() => handleDeleteContact(c.id)}
                        className="rounded-lg p-1.5 text-muted hover:text-danger transition-colors"
                        title="Remove Contact"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>

      </div>

      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
