"use client";

import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import { 
  BookOpen, Search, Phone, ShieldAlert, ListTodo, 
  Plus, Trash2, CheckCircle2, ChevronRight, Star, ShieldCheck, MapPin
} from "lucide-react";

interface CityGuide {
  id: string;
  name: string;
  state: string;
  safetyScore: number;
  emergencyPhone: string;
  policeStation: string;
  hospital: string;
  travelTips: string[];
  highwayWarnings: string[];
  reviews: { author: string; rating: number; date: string; comment: string }[];
}

const CITY_GUIDES: Record<string, CityGuide> = {
  chennai: {
    id: "chennai",
    name: "Chennai",
    state: "Tamil Nadu",
    safetyScore: 94,
    emergencyPhone: "112 / 100",
    policeStation: "Chennai Central Police Control: 044-23452359",
    hospital: "Apollo Hospitals Greams Road: 044-28290200",
    travelTips: [
      "NH 48 corridor to Bangalore has continuous 24/7 fuel plazas with well-lit restrooms.",
      "Women travelers can access pink auto stands and dedicated women's transit coaches.",
      "Carry water during summer months; coastal humidity is high."
    ],
    highwayWarnings: [
      "Heavy container truck movement along Ennore port expressway between 22:00 and 05:00.",
      "Speed radars active along East Coast Road (ECR)."
    ],
    reviews: [
      { author: "Kavitha R.", rating: 5, date: "Aug 2026", comment: "The NH 48 safety corridor from Chennai to Bangalore is extremely safe and well-patrolled." },
      { author: "Rajesh S.", rating: 4, date: "Jul 2026", comment: "Excellent highway infrastructure. Multiple food plazas at 50km intervals." }
    ]
  },
  mumbai: {
    id: "mumbai",
    name: "Mumbai",
    state: "Maharashtra",
    safetyScore: 91,
    emergencyPhone: "112 / 100",
    policeStation: "Mumbai Police HQ: 022-22620111",
    hospital: "Lilavati Hospital: 022-26751000",
    travelTips: [
      "Mumbai-Pune Expressway is fully CCTV monitored with dedicated emergency trauma vans.",
      "Local suburban trains have dedicated 24-hour women's compartments.",
      "Keep digital passes ready for fastag toll lanes."
    ],
    highwayWarnings: [
      "Ghat section near Khandala experiences heavy monsoon fog and wet road conditions.",
      "Strict lane discipline enforced on expressways."
    ],
    reviews: [
      { author: "Vikram M.", rating: 5, date: "Aug 2026", comment: "Great connectivity towards Pune and Hyderabad. Fastag lanes were seamless." }
    ]
  },
  bangalore: {
    id: "bangalore",
    name: "Bangalore",
    state: "Karnataka",
    safetyScore: 92,
    emergencyPhone: "112 / 100",
    policeStation: "Bangalore City Police: 080-22942222",
    hospital: "Manipal Hospital Old Airport Rd: 080-25024444",
    travelTips: [
      "NICE road provides a smooth bypass around city core traffic bottlenecks.",
      "Extensive EV fast-charging network along NH 44 and NH 48 exit corridors.",
      "Helpline 1091 dedicated for women traveler assistance."
    ],
    highwayWarnings: [
      "Peak hour congestion near Electronic City and Silk Board junctions (08:30 - 11:00).",
      "Intermittent road work near Hosur border bypass."
    ],
    reviews: [
      { author: "Ananya B.", rating: 5, date: "Jul 2026", comment: "Travel Guardian helped identify safe rest stops along the highway." }
    ]
  },
  hyderabad: {
    id: "hyderabad",
    name: "Hyderabad",
    state: "Telangana",
    safetyScore: 89,
    emergencyPhone: "112 / 100",
    policeStation: "Hyderabad Police Control: 040-27852435",
    hospital: "Yashoda Hospitals Somajiguda: 040-45674567",
    travelTips: [
      "Nehru Outer Ring Road (ORR) has a 120 km/h design speed with continuous lighting.",
      "She Shuttle services available across IT corridor nodes."
    ],
    highwayWarnings: [
      "Two-wheelers prohibited on the main 8-lane expressway sections of Nehru ORR."
    ],
    reviews: [
      { author: "Praveen K.", rating: 4, date: "Jun 2026", comment: "Smooth transit on NH 65 towards Vijayawada and Vizag." }
    ]
  },
  delhi: {
    id: "delhi",
    name: "Delhi",
    state: "Delhi NCR",
    safetyScore: 85,
    emergencyPhone: "112 / 100",
    policeStation: "Delhi Police HQ: 011-23490010",
    hospital: "AIIMS Emergency Trauma: 011-26588500",
    travelTips: [
      "Yamuna Expressway and Eastern Peripheral Expressway offer swift multi-lane bypasses.",
      "Use verified app-based prepaid cabs at railway stations and airports."
    ],
    highwayWarnings: [
      "Winter morning fog can reduce visibility to under 50 meters on NH 44.",
      "Heavy traffic near Gurugram and Noida border entry points."
    ],
    reviews: [
      { author: "Meera D.", rating: 4, date: "Aug 2026", comment: "Very helpful safety checklist and consular numbers." }
    ]
  },
  vizag: {
    id: "vizag",
    name: "Visakhapatnam",
    state: "Andhra Pradesh",
    safetyScore: 90,
    emergencyPhone: "112 / 100",
    policeStation: "Visakhapatnam City Police: 0891-2565454",
    hospital: "Care Hospitals Ramnagar: 0891-3041000",
    travelTips: [
      "NH 16 coastal corridor is well-maintained with frequent highway patrol check-posts.",
      "Beach road is family friendly and well-lit until midnight."
    ],
    highwayWarnings: [
      "Occasional crosswinds along coastal highway sections."
    ],
    reviews: [
      { author: "Suresh P.", rating: 5, date: "Jul 2026", comment: "Safe city with hospitable locals and smooth highway access." }
    ]
  }
};

export default function SafetyGuideAndReviews() {
  const [selectedCity, setSelectedCity] = useState("chennai");
  const [checklist, setChecklist] = useState<{ id: string; text: string; done: boolean }[]>([
    { id: "1", text: "Download offline route intelligence pack", done: true },
    { id: "2", text: "Configure emergency guardian contacts in Assist Hub", done: true },
    { id: "3", text: "Test GPS location sharing telemetry link", done: false },
    { id: "4", text: "Validate fastag / toll balance for interstate highway transit", done: false },
    { id: "5", text: "Verify vehicle tire pressure & spare wheel before departure", done: false }
  ]);
  const [newCheckItem, setNewCheckItem] = useState("");

  const activeGuide = CITY_GUIDES[selectedCity] || CITY_GUIDES["chennai"];

  const toggleCheck = (id: string) => {
    setChecklist(prev => prev.map(c => c.id === id ? { ...c, done: !c.done } : c));
  };

  const addCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCheckItem.trim()) return;
    setChecklist(prev => [...prev, { id: Date.now().toString(), text: newCheckItem.trim(), done: false }]);
    setNewCheckItem("");
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8 flex flex-col items-center transition-colors duration-200">
      <Header />

      <div className="w-full max-w-7xl px-4 md:px-8 py-6 space-y-6 text-left animate-slideUp">
        
        {/* Header */}
        <div className="border-b border-border pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-black text-primary-accent uppercase tracking-widest block">
              GUIDE & REVIEW SESSIONS
            </span>
            <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight mt-1">
              Safety Guides & Corridor Reviews
            </h1>
            <p className="text-xs text-muted font-semibold mt-0.5">
              Consular emergency directories, highway safety notes, and simulated demo reviews across primary Indian hubs.
            </p>
          </div>

          {/* City Selector */}
          <div className="relative">
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="rounded-2xl bg-surface border border-border px-4 py-2.5 text-xs text-foreground font-black focus:outline-none focus:border-primary-accent shadow-sm cursor-pointer"
            >
              {Object.values(CITY_GUIDES).map(c => (
                <option key={c.id} value={c.id}>{c.name} Safety Guide ({c.state})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Main Guide Column */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* City Banner */}
            <div className="rounded-3xl border border-border bg-surface p-6 md:p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 transition-colors">
              <div>
                <span className="text-[10px] font-black text-primary-accent uppercase tracking-widest">
                  Municipal Safety Dossier
                </span>
                <h2 className="text-3xl font-black text-foreground mt-1">{activeGuide.name}, {activeGuide.state}</h2>
                <p className="text-xs text-muted font-semibold mt-1">
                  Verified emergency infrastructure, recommended highway protocols, and regional safety telemetry.
                </p>
              </div>
              
              <div className="bg-elevated-surface border border-border p-4 rounded-2xl text-center min-w-32">
                <span className="text-3xl font-black text-primary-accent">{activeGuide.safetyScore}</span>
                <p className="text-[8px] font-bold text-muted uppercase tracking-wider mt-1">SAFETY SCORE</p>
              </div>
            </div>

            {/* Emergency Contacts */}
            <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm space-y-4 transition-colors">
              <h3 className="text-xs font-black text-muted uppercase tracking-widest flex items-center gap-2">
                <Phone className="h-4 w-4 text-danger" />
                Emergency & Public Dispatch Contacts
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-elevated-surface border border-border">
                  <span className="text-[9px] font-bold text-muted uppercase block">National Emergency</span>
                  <p className="text-sm font-black text-danger mt-1">{activeGuide.emergencyPhone}</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-elevated-surface border border-border">
                  <span className="text-[9px] font-bold text-muted uppercase block">Police Control HQ</span>
                  <p className="text-xs font-black text-foreground mt-1 truncate">{activeGuide.policeStation}</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-elevated-surface border border-border">
                  <span className="text-[9px] font-bold text-muted uppercase block">Trauma Hospital</span>
                  <p className="text-xs font-black text-foreground mt-1 truncate">{activeGuide.hospital}</p>
                </div>
              </div>
            </div>

            {/* Safety Tips & Warnings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Tips */}
              <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm space-y-3 transition-colors">
                <h3 className="text-xs font-black text-muted uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-success" />
                  Corridor Best Practices
                </h3>
                <div className="space-y-2.5">
                  {activeGuide.travelTips.map((tip, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-muted font-semibold leading-relaxed">
                      <ChevronRight className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Warnings */}
              <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm space-y-3 transition-colors">
                <h3 className="text-xs font-black text-muted uppercase tracking-widest flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-warning" />
                  Highway Advisories & Radar
                </h3>
                <div className="space-y-2.5">
                  {activeGuide.highwayWarnings.map((warn, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-muted font-semibold leading-relaxed">
                      <ChevronRight className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
                      <span>{warn}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Reviews Section */}
            <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm space-y-4 transition-colors">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-xs font-black text-muted uppercase tracking-widest flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                  Traveler Reviews & Experience Log (Demo Data)
                </h3>
                <span className="text-[9px] font-bold text-muted uppercase bg-elevated-surface px-2 py-0.5 rounded">
                  Simulated Reviews
                </span>
              </div>

              <div className="space-y-3">
                {activeGuide.reviews.map((rev, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-elevated-surface border border-border space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-foreground">{rev.author}</span>
                      <div className="flex items-center gap-1 text-amber-400">
                        {Array.from({ length: rev.rating }).map((_, rIdx) => (
                          <Star key={rIdx} className="h-3 w-3 fill-amber-400" />
                        ))}
                        <span className="text-[10px] text-muted ml-1 font-bold">{rev.date}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted font-semibold leading-relaxed">{rev.comment}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column: Pre-Travel Checklist */}
          <div className="lg:col-span-4 space-y-6">
            <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm space-y-4 transition-colors">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-xs font-black text-muted uppercase tracking-widest flex items-center gap-2">
                  <ListTodo className="h-4 w-4 text-primary-accent" />
                  Pre-Journey Checklist
                </h3>
                <span className="text-[9px] font-black text-primary-accent bg-primary-accent/10 px-2 py-0.5 rounded">
                  {checklist.filter(c => c.done).length}/{checklist.length} Done
                </span>
              </div>

              {/* Add form */}
              <form onSubmit={addCheck} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add item..."
                  value={newCheckItem}
                  onChange={(e) => setNewCheckItem(e.target.value)}
                  className="flex-1 rounded-xl bg-elevated-surface border border-border px-3 py-2 text-xs text-foreground font-bold focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-primary-accent px-3 py-2 text-white hover:bg-primary-accent-hover text-xs font-bold"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </form>

              {/* List */}
              <div className="space-y-2">
                {checklist.map(item => (
                  <div
                    key={item.id}
                    onClick={() => toggleCheck(item.id)}
                    className="flex items-center gap-2.5 p-3 rounded-xl bg-elevated-surface border border-border hover:border-primary-accent/30 cursor-pointer select-none transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => {}}
                      className="rounded h-4 w-4 text-primary-accent"
                    />
                    <span className={`text-xs font-semibold ${item.done ? "line-through text-muted" : "text-foreground"}`}>
                      {item.text}
                    </span>
                  </div>
                ))}
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
