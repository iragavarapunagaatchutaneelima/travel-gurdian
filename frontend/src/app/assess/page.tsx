"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TravelGuardianAPI } from "../../services/api";
import { type DestinationResponse } from "../../types/api";
import RiskMeter from "../components/RiskMeter";
import { 
  Calculator, Navigation, Clock, ShieldCheck, ShieldAlert, ArrowRight, 
  Car, Bike, Bus, Footprints, AlertTriangle, Accessibility, Eye, HelpCircle, Calendar,
  Loader
} from "lucide-react";

interface RouteOption {
  type: "fastest" | "safer" | "balanced";
  name: string;
  duration: string;
  distance: string;
  safetyScore: number;
  warnings: string[];
  pois: string[];
}

const translations = {
  en: {
    disclaimer: "⚠️ Disclaimer: Travel Guardian route diagnostics provide risk-aware and safer guidance options based on live telemetry. Route safety cannot be guaranteed due to unpredictable real-time environmental variables.",
    title: "AI Guardian Contextual Report",
    safetyScore: "Vulnerability Index & Safety Margin",
    safestCorridors: "Safer Route Corridor Suggestion",
    safestCorridorsDesc: "Highly illuminated avenues with active CCTV nodes, avoiding dark grid segments.",
    safeStops: "Recommended Safe Stops along path",
    womenSoloSafety: "Solo Traveler / Women Safety Assessment",
    womenSoloSafetyDesc: "Live location telemetry sharing is active. Avoid street stops. Prefer well-monitored tourist streets.",
    contactsAlert: "Emergency Contact Setup Status",
    contactsAlertDesc: "Trusted link established with active guardian contacts.",
    alertsInfo: "Sensed Travel Threat Advisories",
    alertsInfoDesc: "Route successfully bails out of active public unrest and theft warnings.",
    emergencyContacts: "Emergency Assistance Access",
    police: "Local Police Dispatch",
    hospital: "Medical Emergency Hospital",
  },
  hi: {
    disclaimer: "⚠️ अस्वीकरण: ट्रैवल गार्जियन मार्ग निदान लाइव टेलीमेट्री के आधार पर जोखिम-जागरूक और सुरक्षित मार्गदर्शन प्रदान करता है। अप्रत्याशित वास्तविक समय के पर्यावरणीय कारकों के कारण सुरक्षा की गारंटी नहीं दी जा सकती है।",
    title: "एआई गार्जियन संदर्भ-संवेदनशील रिपोर्ट",
    safetyScore: "सुरक्षा स्कोर और जोखिम सीमा",
    safestCorridors: "अधिक सुरक्षित मार्ग गलियारा सुझाव",
    safestCorridorsDesc: "सक्रिय सीसीटीवी कैमरों और अच्छी रोशनी वाले मार्गों को प्राथमिकता दी गई है।",
    safeStops: "मार्ग में अनुशंसित सुरक्षित ठहराव",
    womenSoloSafety: "अकेली महिला / सोलो यात्री सुरक्षा मूल्यांकन",
    womenSoloSafetyDesc: "अपने लाइव स्थान को आपातकालीन संपर्कों के साथ साझा करें। सुनसान क्षेत्रों में रुकने से बचें।",
    contactsAlert: "आपातकालीन संपर्क सेटअप स्थिति",
    contactsAlertDesc: "सक्रिय अभिभावक संपर्कों के साथ विश्वसनीय संबंध स्थापित है।",
    alertsInfo: "सक्रिय यात्रा सुरक्षा चेतावनी स्थिति",
    alertsInfoDesc: "मार्ग चोरी और सार्वजनिक अशांति वाले क्षेत्रों से सुरक्षित रूप से बचता है।",
    emergencyContacts: "आपातकालीन सहायता निर्देशिका",
    police: "स्थानीय पुलिस नियंत्रण कक्ष",
    hospital: "आपातकालीन चिकित्सा अस्पताल",
  },
  ta: {
    disclaimer: "⚠️ மறுப்பு: டிராவல் கார்டியன் வழி கண்டறிதல் நேரடி டெலிமெட்ரியின் அடிப்படையில் ஆபத்து-விழிப்புணர்வு மற்றும் பாதுகாப்பான வழிகாட்டுதலை வழங்குகிறது. எதிர்பாராத நிகழ்நேர காரணிகளால் பாதுகாப்பை உத்தரவாதம் செய்ய முடியாது.",
    title: "AI கார்டியன் சூழல் சார்ந்த பாதுகாப்பு அறிக்கை",
    safetyScore: "பாதுகாப்பு மதிப்பெண் மற்றும் ஆபத்து வரம்பு",
    safestCorridors: "பாதுகாப்பான வழித்தட பரிந்துரை",
    safestCorridorsDesc: "செயலில் உள்ள சிசிடிவி கேமராக்கள் மற்றும் நல்ல வெளிச்சம் உள்ள வழிகளுக்கு முன்னுரிமை அளிக்கப்பட்டுள்ளது.",
    safeStops: "வழியில் பரிந்துரைக்கப்படும் பாதுகாப்பான நிறுத்தங்கள்",
    womenSoloSafety: "தனி நபர் / பெண்கள் பாதுகாப்பு மதிப்பீடு",
    womenSoloSafetyDesc: "அவசரகால தொடர்புகளுடன் உங்கள் நேரடி இருப்பிடத்தைப் பகிரவும். மக்கள் நடமாட்டம் இல்லாத இடங்களில் நிறுத்த வேண்டாம்.",
    contactsAlert: "அவசரகால தொடர்பு அமைப்பு நிலை",
    contactsAlertDesc: "அவசரகால தொடர்புகளுடன் நேரடி இணைப்பு செயலில் உள்ளது.",
    alertsInfo: "செயலில் உள்ள பாதுகாப்பு எச்சரிக்கைகள்",
    alertsInfoDesc: "பொதுப் போராட்டங்கள் மற்றும் திருட்டுச் சம்பவங்கள் நடக்கும் பகுதிகளை இந்த வழி தவிர்க்கிறது.",
    emergencyContacts: "அவசரகால உதவி எண்கள்",
    police: "உள்ளூர் காவல் கட்டுப்பாட்டு அறை",
    hospital: "அவசர சிகிச்சை மருத்துவமனை",
  },
  te: {
    disclaimer: "⚠️ నిరాకరణ: ట్రావెల్ గార్డియన్ లైవ్ టెలిమెట్రీ ఆధారంగా ప్రమాద-అవగాహన మరియు సురక్షితమైన మార్గదర్శకత్వాన్ని అందిస్తుంది. నిజ-సమయ పర్యావరణ కారకాల వల్ల భద్రతకు హామీ ఇవ్వలేము.",
    title: "AI గార్డియన్ సందర్భోచిత భద్రతా నివేదిక",
    safetyScore: "భద్రతా స్కోరు మరియు ప్రమాద పరిమితి",
    safestCorridors: "సురక్షితమైన రూట్ కారిడార్ సూచన",
    safestCorridorsDesc: "యాక్టివ్ సిసిటివి కెమెరాలు మరియు మంచి లైటింగ్ ఉన్న మార్గాలకు ప్రాధాన్యత ఇవ్వబడింది.",
    safeStops: "మార్గంలో సిఫార్సు చేయబడిన సురక్షిత స్టాప్‌లు",
    womenSoloSafety: "ఒంటరి ప్రయాణికులు / మహిళల భద్రత అంచనా",
    womenSoloSafetyDesc: "మీ లైవ్ లొకేషన్‌ను అత్యవసర పరిచయాలతో భాగస్వామ్యం చేయండి. ఒంటరి ప్రదేశాలలో ఆగవద్దు.",
    contactsAlert: "అత్యవసర సంప్రదింపు సెటప్ స్థితి",
    contactsAlertDesc: "అత్యవసర సంప్రదింపులతో లైవ్ లింక్ సక్రియంగా ఉంది.",
    alertsInfo: "సక్రియ ప్రయాణ భద్రతా హెచ్చరికలు",
    alertsInfoDesc: "ఈ మార్గం దొంగతనం మరియు ప్రజా నిరసనలు జరిగే ప్రాంతాలను నివారిస్తుంది.",
    emergencyContacts: "అత్యవసర సహాయ సమాచారం",
    police: "స్థానిక పోలీసు నియంత్రణ గది",
    hospital: "అత్యవసర వైద్య ఆసుపత్రి",
  },
  bn: {
    disclaimer: "⚠️ দাবিত্যাগ: ট্রাভেল গার্ডিয়ান রুট ডায়াগনস্টিকস লাইভ টেলিমেট্রি ভিত্তিক ঝুঁকি-সচেতন এবং নিরাপদ নির্দেশিকা প্রদান করে। অপ্রত্যাশিত পরিবেশগত কারণের জন্য সুরক্ষার গ্যারান্টি দেওয়া যায় না।",
    title: "এআই গার্ডিয়ান প্রসঙ্গ-সংবেদনশীল নিরাপত্তা রিপোর্ট",
    safetyScore: "নিরাপত্তা স্কোর এবং ঝুঁকি সীমা",
    safestCorridors: "নিরাপদ রুট করিডোর পরামর্শ",
    safestCorridorsDesc: "সক্রিয় সিসিটিভি ক্যামেরা এবং ভালো আলো সহ রুটগুলিকে অগ্রাধিকার দেওয়া হয়েছে।",
    safeStops: "রুটে প্রস্তাবিত নিরাপদ স্টপগুলি",
    womenSoloSafety: "একা ভ্রমণকারী / নারী নিরাপত্তা মূল্যায়ন",
    womenSoloSafetyDesc: "আপনার লাইভ অবস্থান জরুরি পরিচিতিদের সাথে শেয়ার করুন। নির্জন এলাকায় থামবেন না।",
    contactsAlert: "জরুরী যোগাযোগ সেটআপ অবস্থা",
    contactsAlertDesc: "জরুরি পরিচিতিদের সাথে লাইভ লিঙ্ক সক্রিয় রয়েছে।",
    alertsInfo: "সক্রিয় ভ্রমণ নিরাপত্তা সতর্কতা",
    alertsInfoDesc: "এই রুটটি চুরি এবং গণবিক্ষোভের এলাকাগুলি এড়িয়ে চলে।",
    emergencyContacts: "জরুরী সহায়তা নির্দেশিকা",
    police: "স্থানীয় পুলিশ কন্ট্রোল রুম",
    hospital: "জরুরি চিকিৎসা হাসপাতাল",
  }
};

function AssessPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Active language selection
  const [langSelect, setLangSelect] = useState("en");

  // Destination Database State
  const [destinations, setDestinations] = useState<DestinationResponse[]>([]);
  const [loading, setLoading] = useState(true);

  // Advanced Planning Form State
  const [fromLocation, setFromLocation] = useState(searchParams.get("from") || "");
  const [toLocation, setToLocation] = useState(searchParams.get("dest") || "Rio de Janeiro");
  const [dateTime, setDateTime] = useState(searchParams.get("date") || "");
  const [transitMode, setTransitMode] = useState(searchParams.get("mode") || "Car"); // Car, Bike, Bus, Walk
  const [travelerType, setTravelerType] = useState("Solo"); // Solo, Family, Group
  const [womenSoloSafety, setWomenSoloSafety] = useState(true);
  const [languagePref, setLanguagePref] = useState("English");
  const [accessibility, setAccessibility] = useState("None"); // Wheelchair, Low Mobility, None
  const [preferences, setPreferences] = useState("Avoid High-Crime Zones");

  // Output Route State
  const [calculating, setCalculating] = useState(false);
  const [calcSteps, setCalcSteps] = useState("");
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<"fastest" | "safer" | "balanced" | null>(null);

  useEffect(() => {
    async function loadDestinations() {
      try {
        const dests = await TravelGuardianAPI.getDestinations();
        setDestinations(dests);
        if (!searchParams.get("dest") && dests.length > 0) {
          setToLocation(dests[0].name);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadDestinations();
  }, []);

  const handlePlanJourney = async (e: React.FormEvent) => {
    e.preventDefault();
    setCalculating(true);
    setRoutes([]);
    setSelectedRoute(null);

    const steps = [
      "Connecting to SENSE route safety nodes...",
      "Simulating threat alerts proximity grids...",
      "Evaluating street illumination and CCTV indexes...",
      "Drafting alternative safety route lines..."
    ];

    for (let i = 0; i < steps.length; i++) {
      setCalcSteps(steps[i]);
      await new Promise(resolve => setTimeout(resolve, 600));
    }

    // Generate mock route options depending on destination selection
    let baseSafety = 75;
    const destObj = destinations.find(d => d.name.toLowerCase() === toLocation.toLowerCase());
    if (destObj) {
      baseSafety = destObj.base_safety_score;
    }

    const calculatedRoutes: RouteOption[] = [
      {
        type: "fastest",
        name: "Fastest GPS Route",
        duration: transitMode === "Walking/On foot" ? "45 mins" : "18 mins",
        distance: "6.2 km",
        safetyScore: Math.max(30, baseSafety - 15 - (womenSoloSafety ? 8 : 0)),
        warnings: [
          "Passes through high-theft street blocks (unlit sections).",
          "Low camera density on secondary avenues."
        ],
        pois: ["Restroom 1.2km", "Petrol Station 2.5km"]
      },
      {
        type: "safer",
        name: "Safer Guardian Route",
        duration: transitMode === "Walking/On foot" ? "58 mins" : "26 mins",
        distance: "8.5 km",
        safetyScore: Math.min(98, baseSafety + 10),
        warnings: [
          "100% lit streets with active municipal CCTV nodes.",
          "Bypasses Lapa/critical hazard coordinates completely.",
          "Features emergency hospital check-points along the corridor."
        ],
        pois: ["General Hospital 0.8km", "Police Sub-station 1.5km", "Restroom 3.2km"]
      },
      {
        type: "balanced",
        name: "Balanced Route",
        duration: transitMode === "Walking/On foot" ? "50 mins" : "21 mins",
        distance: "7.1 km",
        safetyScore: Math.max(45, baseSafety - (womenSoloSafety ? 3 : 0)),
        warnings: [
          "Bypasses critical zones but includes public bus transit lanes.",
          "Moderate lighting. Active pedestrian crowd counts."
        ],
        pois: ["Food Court 1.1km", "Petrol Station 1.8km"]
      }
    ];

    setRoutes(calculatedRoutes);
    setSelectedRoute("safer"); // Recommend Safer route by default
    setCalculating(false);
  };

  const handleOpenLivingMap = (route: RouteOption) => {
    // Route traveler to Living Map (Sense screen) with route parameters
    const query = new URLSearchParams({
      from: fromLocation,
      dest: toLocation,
      route: route.type,
      mode: transitMode,
      score: route.safetyScore.toString(),
      duration: route.duration,
      distance: route.distance
    });
    router.push(`/sense?${query.toString()}`);
  };

  return (
    <div className="flex-grow bg-zinc-950 text-zinc-100 min-h-screen">
      
      {/* Sub-navbar */}
      <nav className="w-full bg-zinc-900 border-b border-zinc-800/80 px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-7 text-xs font-bold text-zinc-400 tracking-wider">
          <span onClick={() => router.push("/dashboard")} className="hover:text-zinc-200 transition-colors cursor-pointer">Home</span>
          <span className="text-emerald-400 border-b-2 border-emerald-500 pb-1 cursor-pointer">Plan Journey</span>
          <span onClick={() => router.push("/sense")} className="hover:text-zinc-200 transition-colors cursor-pointer">Safety</span>
          <span onClick={() => router.push("/sense")} className="hover:text-zinc-200 transition-colors cursor-pointer">Live Map</span>
          <span onClick={() => router.push("/dashboard")} className="hover:text-zinc-200 transition-colors cursor-pointer">My Trips</span>
          <span onClick={() => router.push("/guide")} className="hover:text-zinc-200 transition-colors cursor-pointer">Resources</span>
          <span className="hover:text-zinc-200 transition-colors cursor-pointer">Profile</span>
        </div>
      </nav>

      {/* Main Container */}
      <div className="p-6 md:p-10 max-w-7xl w-full mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-left border-b border-zinc-900 pb-6">
          <span className="text-xs font-black text-emerald-500 uppercase tracking-widest">ASSESS Engine</span>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mt-1">Journey Route Diagnostics</h1>
          <p className="text-sm text-zinc-400 mt-1">Configure advanced travel safety parameters and compare route risk coefficients.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* 1. Advanced Planning Form (left col) */}
          <div className="lg:col-span-4 rounded-3xl border border-zinc-800/80 bg-zinc-900/40 p-6 backdrop-blur-md">
            <h3 className="text-sm font-black text-white tracking-wide mb-4 flex items-center gap-2">
              <Calculator className="h-4.5 w-4.5 text-emerald-500" />
              Advanced Route Inputs
            </h3>

            {loading ? (
              <div className="py-12 text-center text-zinc-500 text-xs">Querying destination indexes...</div>
            ) : (
              <form onSubmit={handlePlanJourney} className="space-y-4 text-left">
                
                {/* From / To */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">From</label>
                    <input
                      type="text"
                      placeholder="e.g. Airport"
                      value={fromLocation}
                      onChange={e => setFromLocation(e.target.value)}
                      className="w-full rounded-xl bg-zinc-950 border border-zinc-900 px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">To</label>
                    <select
                      value={toLocation}
                      onChange={e => setToLocation(e.target.value)}
                      className="w-full rounded-xl bg-zinc-950 border border-zinc-900 px-3 py-2.5 text-xs text-white focus:outline-none"
                    >
                      {destinations.map(d => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Date/Time & Mode */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Date/Time</label>
                    <input
                      type="datetime-local"
                      value={dateTime}
                      onChange={e => setDateTime(e.target.value)}
                      className="w-full rounded-xl bg-zinc-950 border border-zinc-900 px-2 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Mode</label>
                    <select
                      value={transitMode}
                      onChange={e => setTransitMode(e.target.value)}
                      className="w-full rounded-xl bg-zinc-950 border border-zinc-900 px-2 py-2.5 text-xs text-white focus:outline-none"
                    >
                      <option value="Car">Car / Driving</option>
                      <option value="Bike">Bike / Cycling</option>
                      <option value="Bus">Bus / Transit</option>
                      <option value="Walking/On foot">Walking / Foot</option>
                    </select>
                  </div>
                </div>

                {/* Traveler type & Solo safety */}
                <div className="grid grid-cols-2 gap-3 items-center pt-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Traveler Type</label>
                    <select
                      value={travelerType}
                      onChange={e => setTravelerType(e.target.value)}
                      className="w-full rounded-xl bg-zinc-950 border border-zinc-900 px-2 py-2 text-xs text-white focus:outline-none"
                    >
                      <option value="Solo">Solo Traveler</option>
                      <option value="Family">Family Group</option>
                      <option value="Business">Business traveler</option>
                    </select>
                  </div>
                  
                  <label className="flex items-center gap-2 text-[10px] font-bold text-zinc-300 uppercase cursor-pointer select-none mt-5">
                    <input
                      type="checkbox"
                      checked={womenSoloSafety}
                      onChange={() => setWomenSoloSafety(!womenSoloSafety)}
                      className="rounded bg-zinc-950 border-zinc-900 text-emerald-500 focus:ring-0 focus:ring-offset-0 h-4 w-4"
                    />
                    Women/Solo Safety
                  </label>
                </div>

                {/* Language & Accessibility */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Language</label>
                    <select
                      value={languagePref}
                      onChange={e => setLanguagePref(e.target.value)}
                      className="w-full rounded-xl bg-zinc-950 border border-zinc-900 px-2 py-2.5 text-xs text-white focus:outline-none"
                    >
                      <option value="English">English</option>
                      <option value="Local Language">Local Lang</option>
                    </select>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Accessibility</label>
                    <select
                      value={accessibility}
                      onChange={e => setAccessibility(e.target.value)}
                      className="w-full rounded-xl bg-zinc-950 border border-zinc-900 px-2 py-2.5 text-xs text-white focus:outline-none"
                    >
                      <option value="None">None</option>
                      <option value="Wheelchair Access">Wheelchair</option>
                      <option value="Low Mobility Support">Low Mobility</option>
                    </select>
                  </div>
                </div>

                {/* Route Preferences */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">Route Preferences</label>
                  <select
                    value={preferences}
                    onChange={e => setPreferences(e.target.value)}
                    className="w-full rounded-xl bg-zinc-950 border border-zinc-900 px-3 py-2.5 text-xs text-white focus:outline-none"
                  >
                    <option value="Avoid High-Crime Zones">Avoid High-Crime Coordinates</option>
                    <option value="Scenic / Tourism routes">Scenic & Highly Populated</option>
                    <option value="Avoid Highways">Avoid Toll Roads / Highways</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-emerald-600 py-3 text-xs font-black text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-950/20 mt-4"
                >
                  DIAGNOSE ROUTE
                </button>

              </form>
            )}
          </div>

          {/* 2. Route Options Comparison (right col) */}
          <div className="lg:col-span-8 space-y-6">
            
            {calculating && (
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-12 text-center py-28 flex flex-col items-center justify-center min-h-[400px]">
                <Loader className="h-9 w-9 text-emerald-500 animate-spin" />
                <h4 className="mt-4 font-bold text-white text-md">Running Route Safety Simulations...</h4>
                <p className="mt-1 text-xs text-zinc-500">{calcSteps}</p>
              </div>
            )}

            {!calculating && routes.length === 0 && (
              <div className="rounded-3xl border border-zinc-900 bg-zinc-950/40 border-dashed p-12 text-center py-32 flex flex-col items-center justify-center min-h-[400px]">
                <HelpCircle className="h-12 w-12 text-zinc-850" />
                <h4 className="mt-4 font-bold text-zinc-500 text-sm">Diagnostics Queue Empty</h4>
                <p className="mt-1 text-xs text-zinc-650 max-w-xs leading-relaxed">
                  Enter starting point, destination, and safety preferences to trigger route options calculations.
                </p>
              </div>
            )}

            {!calculating && routes.length > 0 && (
              <div className="space-y-6 animate-fadeIn">
                <h3 className="font-extrabold text-white text-lg text-left">Generated Route Options</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {routes.map(route => {
                    const isSelected = selectedRoute === route.type;
                    const safetyColors = 
                      route.safetyScore >= 85 ? "text-emerald-400 border-emerald-500/20 bg-emerald-950/10" :
                      route.safetyScore >= 60 ? "text-amber-400 border-amber-500/20 bg-amber-950/10" :
                      "text-red-400 border-red-500/20 bg-red-950/10";
                      
                    return (
                      <div
                        key={route.type}
                        onClick={() => setSelectedRoute(route.type)}
                        className={`rounded-2xl border p-5 cursor-pointer text-left transition-all duration-200 flex flex-col justify-between hover:shadow-md ${
                          isSelected 
                            ? "bg-zinc-900 border-emerald-500 shadow-md shadow-emerald-950/20" 
                            : "bg-zinc-950 border-zinc-900 hover:border-zinc-800"
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${safetyColors}`}>
                              {route.safetyScore} Safety
                            </span>
                            <span className="text-[10px] text-zinc-500 font-bold uppercase">{route.type}</span>
                          </div>

                          <h4 className="font-black text-white text-sm mt-2">{route.name}</h4>
                          <div className="flex gap-4 text-xs font-bold text-zinc-400 mt-2">
                            <span>{route.duration}</span>
                            <span>{route.distance}</span>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="text-[10px] text-emerald-400 font-black mt-4 flex items-center gap-1">
                            ✓ ACTIVE SELECTION
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Selected Route Diagnostics Detail Card */}
                {selectedRoute && (
                  <div className="rounded-3xl border border-zinc-800 bg-zinc-900/30 p-6 md:p-8 text-left space-y-6 animate-fadeIn">
                    
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-b border-zinc-900 pb-6">
                      <div>
                        <h4 className="text-xl font-black text-white">
                          {routes.find(r => r.type === selectedRoute)?.name} Details
                        </h4>
                        <p className="text-xs text-zinc-500 mt-1">
                          Parameters: {fromLocation} to {toLocation} via {transitMode}
                        </p>
                      </div>
                      
                      <button
                        onClick={() => handleOpenLivingMap(routes.find(r => r.type === selectedRoute)!)}
                        className="rounded-xl bg-emerald-600 px-6 py-3 text-xs font-black text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-950/20 flex items-center gap-2"
                      >
                        <span>OPEN LIVING MAP</span>
                        <ArrowRight className="h-4.5 w-4.5" />
                      </button>
                    </div>

                    {/* Threat Warnings on selected route */}
                    <div className="space-y-4">
                      <h5 className="text-xs font-black text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                        <AlertTriangle className="h-4.5 w-4.5 text-amber-500 animate-pulse" />
                        Sensed Warnings Along route
                      </h5>

                      <div className="space-y-2">
                        {routes.find(r => r.type === selectedRoute)?.warnings.map((warn, idx) => (
                          <div key={idx} className="flex gap-3 rounded-xl bg-zinc-950 border border-zinc-900 p-3.5 text-xs text-zinc-300 font-semibold leading-relaxed">
                            <ShieldAlert className="h-4.5 w-4.5 text-amber-500 flex-shrink-0 mt-0.5" />
                            <span>{warn}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* POI indicators */}
                    <div className="space-y-3 pt-2">
                      <h5 className="text-xs font-black text-zinc-500 uppercase tracking-wider">
                        Detected Safe POIs along route
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {routes.find(r => r.type === selectedRoute)?.pois.map((poi, idx) => (
                          <span key={idx} className="rounded-lg bg-zinc-950 border border-zinc-900 px-3 py-1.5 text-xs text-zinc-400 font-semibold">
                            📍 {poi}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* AI GUARDIAN CONTEXTUAL SAFETY GUIDANCE REPORT */}
                    <div className="border-t border-zinc-900 pt-6 space-y-6">
                      
                      {/* Language Selection Header */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-2 text-emerald-400">
                          <ShieldCheck className="h-5 w-5 animate-pulse" />
                          <h4 className="font-black text-sm uppercase tracking-wider">
                            {langSelect === "en" ? "AI Guardian Guidance" :
                             langSelect === "hi" ? "एआई गार्जियन मार्गदर्शन" :
                             langSelect === "ta" ? "AI கார்டியன் வழிகாட்டுதல்" :
                             langSelect === "te" ? "AI గార్డియన్ మార్గదర్శకత్వం" :
                             "এআই গার্ডিয়ান নির্দেশিকা"}
                          </h4>
                        </div>
                        
                        {/* Language tabs */}
                        <div className="flex flex-wrap gap-1">
                          {[
                            { id: "en", label: "English" },
                            { id: "hi", label: "हिंदी" },
                            { id: "ta", label: "தமிழ்" },
                            { id: "te", label: "తెలుగు" },
                            { id: "bn", label: "বাংলা" }
                          ].map(l => (
                            <button
                              key={l.id}
                              type="button"
                              onClick={() => setLangSelect(l.id)}
                              className={`rounded-lg px-3 py-1.5 text-[10px] font-black border transition-all ${
                                langSelect === l.id
                                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                  : "bg-zinc-950 border-zinc-900 text-zinc-500 hover:text-zinc-300"
                              }`}
                            >
                              {l.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Disclaimer warning */}
                      <div className="rounded-2xl border border-zinc-900 bg-zinc-950/60 p-4 text-[10px] text-zinc-500 leading-relaxed font-semibold">
                        {translations[langSelect as keyof typeof translations].disclaimer}
                      </div>

                      {/* Guidance Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        {/* Column 1: Corridor suggestions */}
                        <div className="rounded-2xl bg-zinc-950 p-4 border border-zinc-900 text-left space-y-1">
                          <span className="text-[9px] font-extrabold text-zinc-500 uppercase tracking-widest block">
                            {translations[langSelect as keyof typeof translations].safestCorridors}
                          </span>
                          <p className="text-xs font-bold text-white mt-1">
                            {selectedRoute === "safer" 
                              ? (langSelect === "en" ? "CCTV-Monitored Corridor" : 
                                 langSelect === "hi" ? "सीसीटीवी-निगरानी मार्ग" : 
                                 langSelect === "ta" ? "CCTV கண்காணிப்பு பாதை" : 
                                 langSelect === "te" ? "CCTV కెమెరాల నిఘా మార్గం" : 
                                 "সিসিটিভি-নিয়ন্ত্রিত করিডোর")
                              : (langSelect === "en" ? "High Speed, Low Monitoring Corridor" :
                                 langSelect === "hi" ? "उच्च गति, कम निगरानी मार्ग" :
                                 langSelect === "ta" ? "வேகமான, குறைந்த கண்காணிப்பு பாதை" :
                                 langSelect === "te" ? "హై స్పీడ్, తక్కువ నిఘా మార్గం" :
                                 "উচ্চ গতি, কম সিসিটিভি করিডোর")}
                          </p>
                          <p className="text-[10px] text-zinc-500 mt-1 leading-normal">
                            {translations[langSelect as keyof typeof translations].safestCorridorsDesc}
                          </p>
                        </div>

                        {/* Column 2: Women/Solo Safety */}
                        <div className="rounded-2xl bg-zinc-950 p-4 border border-zinc-900 text-left space-y-1">
                          <span className="text-[9px] font-extrabold text-zinc-500 uppercase tracking-widest block">
                            {translations[langSelect as keyof typeof translations].womenSoloSafety}
                          </span>
                          <p className="text-xs font-bold text-white mt-1">
                            {womenSoloSafety 
                              ? (langSelect === "en" ? "Active Vigilance Required" : 
                                 langSelect === "hi" ? "सक्रिय सतर्कता आवश्यक है" : 
                                 langSelect === "ta" ? "தீவிர விழிப்புணர்வு தேவை" : 
                                 langSelect === "te" ? "సక్రియ నిఘా అవసరం" : 
                                 "সক্রিয় সতর্কতা প্রয়োজন")
                              : (langSelect === "en" ? "Standard Safety Margins" :
                                 langSelect === "hi" ? "सामान्य सुरक्षा सीमा" :
                                 langSelect === "ta" ? "சாதாரண பாதுகாப்பு வரம்பு" :
                                 langSelect === "te" ? "సాధారణ భద్రతా పరిమితి" :
                                 "সাধারণ নিরাপত্তা মার্জিন")}
                          </p>
                          <p className="text-[10px] text-zinc-500 mt-1 leading-normal">
                            {translations[langSelect as keyof typeof translations].womenSoloSafetyDesc}
                          </p>
                        </div>

                        {/* Column 3: Emergency Contacts status */}
                        <div className="rounded-2xl bg-zinc-950 p-4 border border-zinc-900 text-left space-y-1">
                          <span className="text-[9px] font-extrabold text-zinc-500 uppercase tracking-widest block">
                            {translations[langSelect as keyof typeof translations].contactsAlert}
                          </span>
                          <p className="text-xs font-bold text-white mt-1">
                            {langSelect === "en" ? "Sarah Miller (Partner) Linked" : 
                             langSelect === "hi" ? "सारा मिलर (अभिभावक) लिंक हैं" : 
                             langSelect === "ta" ? "சாரா மில்லர் இணைக்கப்பட்டுள்ளார்" : 
                             langSelect === "te" ? "సారా మిల్లర్ లింక్ చేయబడ్డారు" : 
                             "সারাহ মিলার লিঙ্ক করা আছে"}
                          </p>
                          <p className="text-[10px] text-zinc-500 mt-1 leading-normal">
                            {translations[langSelect as keyof typeof translations].contactsAlertDesc}
                          </p>
                        </div>

                        {/* Column 4: Threat bulletins checks */}
                        <div className="rounded-2xl bg-zinc-950 p-4 border border-zinc-900 text-left space-y-1">
                          <span className="text-[9px] font-extrabold text-zinc-500 uppercase tracking-widest block">
                            {translations[langSelect as keyof typeof translations].alertsInfo}
                          </span>
                          <p className="text-xs font-bold text-white mt-1">
                            {langSelect === "en" ? "Clean Navigation Path" : 
                             langSelect === "hi" ? "बाधा रहित मार्ग" : 
                             langSelect === "ta" ? "தடையற்ற பாதை" : 
                             langSelect === "te" ? "అడ్డంకులు లేని మార్గం" : 
                             "বাধামুক্ত নেভিগেশন পথ"}
                          </p>
                          <p className="text-[10px] text-zinc-500 mt-1 leading-normal">
                            {translations[langSelect as keyof typeof translations].alertsInfoDesc}
                          </p>
                        </div>

                      </div>

                      {/* Emergency Hotline Directories */}
                      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 text-left space-y-3">
                        <span className="text-[9px] font-extrabold text-zinc-500 uppercase tracking-widest block">
                          {translations[langSelect as keyof typeof translations].emergencyContacts}
                        </span>
                        
                        <div className="flex flex-col md:flex-row gap-4 justify-between text-xs font-bold">
                          <div className="flex items-center gap-2">
                            <span>🚨 {translations[langSelect as keyof typeof translations].police}:</span>
                            <span className="text-emerald-400">112 / 100</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>🏥 {translations[langSelect as keyof typeof translations].hospital}:</span>
                            <span className="text-emerald-400">112 / 102</span>
                          </div>
                          
                          <a
                            href="tel:112"
                            className="rounded-lg bg-red-600/90 hover:bg-red-500 px-3 py-1.5 text-[10px] text-white flex items-center justify-center gap-1.5 shadow"
                          >
                            <span>SOS EMER DISPATCH</span>
                          </a>
                        </div>
                      </div>

                    </div>

                  </div>
                )}

              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}

export default function AssessRisk() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 text-zinc-500 flex flex-col items-center justify-center gap-3 text-xs font-bold">
        <div className="h-6 w-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span>Resolving route diagnostic vectors...</span>
      </div>
    }>
      <AssessPageContent />
    </Suspense>
  );
}
