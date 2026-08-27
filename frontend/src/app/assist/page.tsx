"use client";

import React, { useState, useEffect } from "react";
import { TravelGuardianAPI } from "../../services/api";
import { type EmergencyContactResponse, type SafeCheckInResponse } from "../../types/api";
import { HeartHandshake, UserPlus, Trash2, Clock, AlertTriangle, ShieldCheck, HelpCircle, Send, ShieldAlert, Loader } from "lucide-react";

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
  const [timerDuration, setTimerDuration] = useState("2"); // hours
  const [checkinNote, setCheckinNote] = useState("");

  // Live Timer state
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null); // in seconds
  const [timerIntervalId, setTimerIntervalId] = useState<any>(null);
  const [timerTriggered, setTimerTriggered] = useState(false);

  // Chatbot State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { sender: "bot", text: "Guardian Command Center linked. Specify location queries or security advisories." }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

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

  // Timer helper
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

    // Calculate target time
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
      setCheckins([]);
      setTimeRemaining(null);
      setTimerTriggered(false);
      if (timerIntervalId) clearInterval(timerIntervalId);
    } catch (err) {
      // Force local clean
      setCheckins([]);
      setTimeRemaining(null);
      setTimerTriggered(false);
      if (timerIntervalId) clearInterval(timerIntervalId);
    }
  };

  const formatTime = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // GuardBot Chat Logic
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput.trim();
    setChatMessages(prev => [...prev, { sender: "user", text: userMsg }]);
    setChatInput("");
    setChatLoading(true);

    // Simple interactive response engine simulating security support
    let botReply = "Connecting to global safety repositories... I didn't catch that. Could you please specify a destination or emergency context?";
    
    const lowerMsg = userMsg.toLowerCase();
    if (lowerMsg.includes("rio") || lowerMsg.includes("copacabana") || lowerMsg.includes("lapa")) {
      botReply = "SECURITY ADVISORY (Rio de Janeiro): High snatch-and-grab threat in beach fronts and transit zones. Avoid showing valuables or phone usage on public streets. If using rideshares, confirm license match inside buildings first.";
    } else if (lowerMsg.includes("tokyo") || lowerMsg.includes("japan")) {
      botReply = "SITUATION REPORT (Tokyo): Excellent general public security. Current high-severity typhoon warnings active. Verify railway schedules (Shinkansen route delays) and keep local flashlights in hotel rooms.";
    } else if (lowerMsg.includes("paris") || lowerMsg.includes("louvre") || lowerMsg.includes("metro")) {
      botReply = "SECURITY ADVISORY (Paris): Active public transport strikes and protests near central plazas. Louvre/Eiffel regions experiencing heavy pickpocket activities. Keep zip closures facing inwards and ignore clipboard sign-up groups.";
    } else if (lowerMsg.includes("cairo") || lowerMsg.includes("egypt")) {
      botReply = "CULTURAL ADVISORY (Cairo): Ensure modest wear (shoulders & knees covered) in public spaces. Avoid taking photos near governmental/police installations. Carry cash as card nodes are limited outside hotels.";
    } else if (lowerMsg.includes("lost passport") || lowerMsg.includes("passport lost")) {
      botReply = "EMERGENCY PROTOCOL (Lost Passport): 1. File a local police report immediately. 2. Contact nearest consular office of your home country. 3. Schedule emergency document issuance appointments. Register details in STEP for speed.";
    } else if (lowerMsg.includes("robbed") || lowerMsg.includes("stolen") || lowerMsg.includes("police")) {
      botReply = "EMERGENCY PROTOCOL (Robbery): Move immediately to a well-lit public space. Locate the nearest municipal police station. Do not physically resist theft. Access the GUIDE tab to dial direct local police emergency lines.";
    }

    setTimeout(() => {
      setChatMessages(prev => [...prev, { sender: "bot", text: botReply }]);
      setChatLoading(false);
    }, 1200);
  };

  return (
    <div className="flex-1 px-6 py-8 md:px-12 md:py-12 max-w-7xl mx-auto w-full space-y-8">
      
      {/* Header */}
      <div className="border-b border-zinc-900 pb-6">
        <span className="text-xs font-black text-emerald-500 uppercase tracking-widest">ASSIST Dashboard</span>
        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mt-1">SOS & Guardian Hub</h1>
        <p className="text-sm text-zinc-400 mt-1">Configure emergency contacts, schedule safe check-in timelines, and query virtual safety advisors.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Safe Check-in Timer */}
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/40 p-6 backdrop-blur-md flex flex-col justify-between min-h-[420px]">
            <div>
              <h3 className="text-sm font-black text-white tracking-wide mb-4 flex items-center gap-2">
                <Clock className="h-4.5 w-4.5 text-cyan-400 animate-pulse" />
                Dead Man's Safe Check-In
              </h3>

              {loadingCheckin ? (
                <div className="py-12 text-center text-zinc-500 text-xs">Accessing checkin configurations...</div>
              ) : timeRemaining !== null ? (
                // Active countdown widget
                <div className="space-y-6 text-center py-6">
                  <div className={`mx-auto flex h-36 w-36 flex-col items-center justify-center rounded-full border-4 ${
                    timerTriggered ? "border-red-500 bg-red-950/20 text-red-500" : "border-cyan-500 bg-cyan-950/20 text-cyan-400"
                  }`}>
                    <span className="text-2xl font-black">{formatTime(timeRemaining)}</span>
                    <span className="text-[9px] font-bold text-zinc-500 mt-1 uppercase tracking-wider">TIME REMAINING</span>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-extrabold text-white text-sm">
                      {timerTriggered ? "CRITICAL: TIMER EXPIRED" : "Monitoring Active Window"}
                    </h4>
                    <p className="text-xs text-zinc-400 px-4 leading-relaxed">
                      {timerTriggered 
                        ? "Check-in window expired! Warning alerts have been dispatched to registered contacts."
                        : "Fail-safe active. Verify you are safe before the countdown expires to prevent guardian alert dispatch."}
                    </p>
                  </div>

                  <button
                    onClick={handleCancelTimer}
                    className="w-full rounded-xl bg-emerald-600/90 py-3 text-xs font-black text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-950/20"
                  >
                    CONFIRM CHECK-IN (I AM SAFE)
                  </button>
                </div>
              ) : (
                // Setup timer form
                <form onSubmit={handleStartTimer} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-500">Check-in Duration</label>
                    <select
                      value={timerDuration}
                      onChange={e => setTimerDuration(e.target.value)}
                      className="w-full rounded-xl bg-zinc-950 border border-zinc-900 px-3 py-2.5 text-sm text-white focus:outline-none"
                    >
                      <option value="0.05">3 Minutes (Demo mode)</option>
                      <option value="1">1 Hour (Local walking transit)</option>
                      <option value="2">2 Hours (Airport commute)</option>
                      <option value="4">4 Hours (Inter-city train)</option>
                      <option value="8">8 Hours (Night train/hiking)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-500">Destination Note / Context</label>
                    <input
                      type="text"
                      placeholder="e.g. Taking taxi route from Lapa to Copacabana"
                      value={checkinNote}
                      onChange={e => setCheckinNote(e.target.value)}
                      className="w-full rounded-xl bg-zinc-950 border border-zinc-900 px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-xl bg-cyan-600/90 py-3 text-xs font-black text-white hover:bg-cyan-500 transition-colors shadow-lg shadow-cyan-950/20 mt-4"
                  >
                    START FAIL-SAFE TIMER
                  </button>
                </form>
              )}
            </div>

            {/* Note */}
            <div className="rounded-2xl bg-zinc-950 p-4 border border-zinc-900 flex items-start gap-2.5 text-[10px] text-zinc-500 leading-relaxed font-semibold mt-4">
              <ShieldCheck className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span>If check-in deadline is bypassed, the system broadcasts telemetry and custom text to your guardians automatically.</span>
            </div>
          </div>
        </div>

        {/* Center Column: Guardian Directory */}
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/40 p-6 backdrop-blur-md flex flex-col justify-between min-h-[420px]">
            <div>
              <h3 className="text-sm font-black text-white tracking-wide mb-4 flex items-center gap-2">
                <UserPlus className="h-4.5 w-4.5 text-rose-400" />
                Emergency Guardian Registry
              </h3>

              {/* Add form */}
              <form onSubmit={handleAddContact} className="space-y-3 mb-6 bg-zinc-950 border border-zinc-900 p-4 rounded-2xl">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={cName}
                    onChange={e => setCName(e.target.value)}
                    className="rounded-xl bg-zinc-900 border border-zinc-850 px-3 py-2 text-xs text-white focus:outline-none"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Phone Number"
                    value={cPhone}
                    onChange={e => setCPhone(e.target.value)}
                    className="rounded-xl bg-zinc-900 border border-zinc-850 px-3 py-2 text-xs text-white focus:outline-none"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="email"
                    placeholder="Email (Optional)"
                    value={cEmail}
                    onChange={e => setCEmail(e.target.value)}
                    className="col-span-2 rounded-xl bg-zinc-900 border border-zinc-850 px-3 py-2 text-xs text-white focus:outline-none"
                  />
                  
                  <select
                    value={cRelation}
                    onChange={e => setCRelation(e.target.value)}
                    className="rounded-xl bg-zinc-900 border border-zinc-850 px-2 py-2 text-[10px] text-zinc-300 focus:outline-none font-bold"
                  >
                    <option value="Spouse/Partner">Partner</option>
                    <option value="Parent">Parent</option>
                    <option value="Friend">Friend</option>
                    <option value="Colleague">Colleague</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-zinc-900 border border-zinc-800 py-2 text-[10px] font-black text-zinc-300 hover:bg-zinc-850 hover:text-white transition-colors"
                >
                  REGISTER GUARDIAN CONTACT
                </button>
              </form>

              {/* List */}
              {loadingContacts ? (
                <div className="text-center text-zinc-500 text-xs py-6">Connecting contact networks...</div>
              ) : contacts.length === 0 ? (
                <div className="text-center py-8 text-xs text-zinc-500 font-semibold">
                  No guardians registered. Register a contact to support SOS broadcasts.
                </div>
              ) : (
                <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                  {contacts.map(c => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded-xl bg-zinc-950/60 p-3 border border-zinc-900"
                    >
                      <div>
                        <h4 className="font-extrabold text-white text-xs leading-none">{c.name}</h4>
                        <p className="text-[9px] text-zinc-500 font-bold mt-1.5 uppercase tracking-wider">
                          {c.relation} • {c.phone}
                        </p>
                      </div>
                      
                      <button
                        onClick={() => handleDeleteContact(c.id)}
                        className="rounded bg-zinc-900 p-1.5 text-zinc-600 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: GuardBot AI Security Advisor */}
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/40 p-6 backdrop-blur-md flex flex-col justify-between min-h-[420px]">
            <div>
              <h3 className="text-sm font-black text-white tracking-wide mb-4 flex items-center gap-2">
                <ShieldAlert className="h-4.5 w-4.5 text-emerald-400" />
                GuardBot Virtual security
              </h3>

              {/* Message flow */}
              <div className="space-y-3 h-[250px] overflow-y-auto pr-1 flex flex-col mb-4">
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`rounded-2xl p-3 max-w-[85%] text-xs font-semibold leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/15 align-self-end ml-auto"
                        : "bg-zinc-950 text-zinc-300 border border-zinc-900 mr-auto"
                    }`}
                  >
                    {msg.text}
                  </div>
                ))}
                {chatLoading && (
                  <div className="bg-zinc-950 text-zinc-500 border border-zinc-900 mr-auto rounded-2xl p-3 flex items-center gap-2">
                    <Loader className="h-4 w-4 animate-spin text-emerald-500" />
                    <span className="text-[10px] font-bold">Querying local bulletins...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                placeholder="Ask e.g. 'lost passport' or 'Rio safety'..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                className="flex-1 rounded-xl bg-zinc-950 border border-zinc-900 px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                disabled={chatLoading}
              />
              <button
                type="submit"
                className="rounded-xl bg-emerald-600 p-3 text-white hover:bg-emerald-500 disabled:opacity-50"
                disabled={chatLoading}
              >
                <Send className="h-4.5 w-4.5" />
              </button>
            </form>

          </div>
        </div>

      </div>

    </div>
  );
}
