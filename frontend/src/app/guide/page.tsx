"use client";

import React, { useState, useEffect } from "react";
import { TravelGuardianAPI } from "../../services/api";
import { type DestinationResponse } from "../../types/api";
import { BookOpen, Search, Phone, ShieldAlert, ListTodo, Plus, Trash2, CheckCircle2, ChevronRight, HelpCircle } from "lucide-react";

interface EmergencyContacts {
  police: string;
  fire: string;
  medical: string;
  embassy: string;
}

export default function SafetyGuide() {
  const [destinations, setDestinations] = useState<DestinationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("Tokyo");
  const [activeDetails, setActiveDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Checklist State
  const [checklist, setChecklist] = useState<{ id: string; text: string; done: boolean; category: string }[]>([]);
  const [newCheckItem, setNewCheckItem] = useState("");
  const [checkCat, setCheckCat] = useState("pre-travel");

  const defaultChecklist = [
    { id: "1", text: "Validate passport expiration date is >6 months past return", done: true, category: "pre-travel" },
    { id: "2", text: "Acquire secondary travel medical health insurance", done: false, category: "pre-travel" },
    { id: "3", text: "Register travel parameters in US Embassy STEP system", done: false, category: "pre-travel" },
    { id: "4", text: "Cache offline Google maps of target accommodation neighborhoods", done: true, category: "on-arrival" },
    { id: "5", text: "Confirm emergency contact contacts details configured in Guardian Hub", done: false, category: "on-arrival" },
    { id: "6", text: "Secure international electricity converter nodes", done: false, category: "packing" },
    { id: "7", text: "Cache paper hardcopies of visas & insurance contracts", done: false, category: "packing" }
  ];

  useEffect(() => {
    async function loadInitialData() {
      try {
        const dests = await TravelGuardianAPI.getDestinations();
        setDestinations(dests);
        if (dests.length > 0) {
          fetchDetails("Tokyo");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();

    // Load custom checklist from localstorage if exists
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("tg_checklist");
      if (stored) {
        setChecklist(JSON.parse(stored));
      } else {
        setChecklist(defaultChecklist);
        localStorage.setItem("tg_checklist", JSON.stringify(defaultChecklist));
      }
    }
  }, []);

  const fetchDetails = async (cityName: string) => {
    setLoadingDetails(true);
    try {
      const details = await TravelGuardianAPI.getDestinationDetails(cityName);
      setActiveDetails(details);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Checklist actions
  const toggleCheckItem = (id: string) => {
    const updated = checklist.map(item => item.id === id ? { ...item, done: !item.done } : item);
    setChecklist(updated);
    localStorage.setItem("tg_checklist", JSON.stringify(updated));
  };

  const deleteCheckItem = (id: string) => {
    const updated = checklist.filter(item => item.id !== id);
    setChecklist(updated);
    localStorage.setItem("tg_checklist", JSON.stringify(updated));
  };

  const addCheckItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCheckItem.trim()) return;

    const newItem = {
      id: Date.now().toString(),
      text: newCheckItem.trim(),
      done: false,
      category: checkCat
    };

    const updated = [...checklist, newItem];
    setChecklist(updated);
    localStorage.setItem("tg_checklist", JSON.stringify(updated));
    setNewCheckItem("");
  };

  const getProgress = () => {
    if (checklist.length === 0) return 0;
    const completed = checklist.filter(c => c.done).length;
    return Math.round((completed / checklist.length) * 100);
  };

  return (
    <div className="flex-1 px-6 py-8 md:px-12 md:py-12 max-w-7xl mx-auto w-full space-y-8">
      
      {/* Header */}
      <div className="border-b border-zinc-900 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-black text-emerald-500 uppercase tracking-widest">GUIDE Directory</span>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mt-1">Safety Guide & Checklists</h1>
          <p className="text-sm text-zinc-400 mt-1">Consular emergency directories, local statutes, and safety checklists.</p>
        </div>

        {/* Quick Search Selector */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-500" />
          <select
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              fetchDetails(e.target.value);
            }}
            className="rounded-xl bg-zinc-900 border border-zinc-800 pl-10 pr-8 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 appearance-none cursor-pointer"
          >
            {destinations.map(d => (
              <option key={d.id} value={d.name}>{d.name} Guide</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Destination Guide Details */}
        <div className="lg:col-span-2 space-y-6">
          
          {loadingDetails && (
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-12 text-center flex flex-col items-center justify-center py-32 min-h-[400px]">
              <div className="h-6 w-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-xs text-zinc-500">Querying consular directories...</p>
            </div>
          )}

          {!loadingDetails && activeDetails && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Main Banner */}
              <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/40 p-6 md:p-8 backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Global Safety Database</span>
                  <h2 className="text-3xl font-black text-white mt-1.5">{activeDetails.name}, {activeDetails.country}</h2>
                  <p className="text-sm text-zinc-400 mt-1">Safety rating indexes and consular support access profiles.</p>
                </div>
                
                <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-2xl text-center flex-shrink-0 min-w-32">
                  <span className="text-2xl font-black text-white">{activeDetails.base_safety_score}</span>
                  <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mt-0.5">BASE SAFETY INDEX</p>
                </div>
              </div>

              {/* Emergency Contacts grid */}
              <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/40 p-6 backdrop-blur-md">
                <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Phone className="h-4 w-4 text-rose-500" />
                  Consular & Public Safety Directories
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(activeDetails.emergency_contacts as EmergencyContacts).map(([name, num]) => (
                    <div key={name} className="flex justify-between items-center rounded-2xl bg-zinc-950 p-4 border border-zinc-900">
                      <div>
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{name === "embassy" ? "Embassy Contact" : name + " Dispatch"}</span>
                        <p className="text-xs font-black text-white mt-0.5 leading-none">{num}</p>
                      </div>
                      
                      <a
                        href={`tel:${num}`}
                        className="rounded-full bg-zinc-900 p-2.5 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                      >
                        <Phone className="h-4.5 w-4.5 text-rose-400" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              {/* Culture and Laws grids */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Cultural tips */}
                <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/40 p-6 backdrop-blur-md">
                  <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-cyan-400" />
                    Cultural Code & Etiquettes
                  </h3>
                  
                  <div className="space-y-3">
                    {activeDetails.cultural_tips.map((tip: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-zinc-300 leading-relaxed font-semibold">
                        <ChevronRight className="h-4 w-4 text-cyan-500 flex-shrink-0 mt-0.5" />
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Local laws */}
                <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/40 p-6 backdrop-blur-md">
                  <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-amber-500" />
                    Local Statutes & Warnings
                  </h3>
                  
                  <div className="space-y-3">
                    {activeDetails.local_laws.map((law: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-zinc-300 leading-relaxed font-semibold">
                        <ChevronRight className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <span>{law}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>

        {/* Packing & Custom Checklists Column */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Smart checklist */}
          <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/40 p-6 backdrop-blur-md flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-black text-white tracking-wide flex items-center gap-2">
                  <ListTodo className="h-4.5 w-4.5 text-emerald-500" />
                  Travel Checklist
                </h3>
                <span className="text-[10px] font-black text-emerald-400 bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-500/10">
                  {getProgress()}% DONE
                </span>
              </div>
              
              {/* Progress bar */}
              <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden mb-6 border border-zinc-900">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${getProgress()}%` }}
                />
              </div>

              {/* Add form */}
              <form onSubmit={addCheckItem} className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Add checklist item..."
                  value={newCheckItem}
                  onChange={e => setNewCheckItem(e.target.value)}
                  className="flex-1 rounded-xl bg-zinc-950 border border-zinc-900 px-3.5 py-2 text-xs text-white focus:outline-none"
                  required
                />
                <button
                  type="submit"
                  className="rounded-xl bg-zinc-900 border border-zinc-800 p-2 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </form>

              {/* Checklist list grouped by category */}
              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                {["pre-travel", "packing", "on-arrival"].map(category => {
                  const catItems = checklist.filter(item => item.category === category);
                  if (catItems.length === 0) return null;
                  
                  return (
                    <div key={category} className="space-y-1.5">
                      <h4 className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-900 pb-1 capitalize">
                        {category.replace("-", " ")}
                      </h4>
                      
                      <div className="space-y-1">
                        {catItems.map(item => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between rounded-xl bg-zinc-950/60 p-2.5 border border-zinc-900 hover:border-zinc-850 transition-colors"
                          >
                            <label className="flex items-center gap-2.5 text-xs font-semibold cursor-pointer select-none flex-1 text-zinc-300">
                              <input
                                type="checkbox"
                                checked={item.done}
                                onChange={() => toggleCheckItem(item.id)}
                                className="rounded bg-zinc-950 border-zinc-900 text-emerald-500 focus:ring-0 focus:ring-offset-0 h-4 w-4"
                              />
                              <span className={item.done ? "line-through text-zinc-500 font-medium" : ""}>
                                {item.text}
                              </span>
                            </label>
                            
                            <button
                              onClick={() => deleteCheckItem(item.id)}
                              className="text-zinc-600 hover:text-zinc-400 p-1 rounded-lg"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Checklist Category picker for add form */}
            <div className="mt-6 pt-4 border-t border-zinc-900 flex items-center justify-between text-[10px] font-bold text-zinc-500">
              <span>Category for addition:</span>
              <div className="flex gap-1">
                {["pre-travel", "packing", "on-arrival"].map(c => (
                  <button
                    key={c}
                    onClick={() => setCheckCat(c)}
                    className={`px-2 py-0.5 rounded capitalize ${
                      checkCat === c ? "bg-zinc-800 text-zinc-200" : "bg-transparent hover:text-zinc-300"
                    }`}
                  >
                    {c.split("-")[0]}
                  </button>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
