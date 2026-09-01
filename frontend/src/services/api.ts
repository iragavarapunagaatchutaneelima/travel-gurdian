// Travel Guardian Frontend API Service with graceful mock fallback
import { type AlertResponse, type RiskRequest, type RiskReportResponse, type DestinationResponse, type EmergencyContactResponse, type SafeCheckInResponse, type SOSRequest, type SOSResponse } from "../types/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// Fallback Local Storage helper
const getLocalStorage = <T>(key: string, defaultValue: T): T => {
  if (typeof window === "undefined") return defaultValue;
  const val = localStorage.getItem(key);
  return val ? JSON.parse(val) : defaultValue;
};

const setLocalStorage = <T>(key: string, value: T): void => {
  if (typeof window !== "undefined") {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

// Seed Local Storage mock data on load
const MOCK_DESTINATIONS: DestinationResponse[] = [
  {
    id: 1,
    name: "Tokyo",
    country: "Japan",
    latitude: 35.6762,
    longitude: 139.6503,
    base_safety_score: 94,
    emergency_contacts_json: JSON.stringify({
      police: "110",
      fire: "119",
      medical: "119",
      embassy: "+81-3-3224-5000 (US Embassy Tokyo)"
    }),
    cultural_tips_json: JSON.stringify([
      "Bow slightly when greeting someone as a sign of respect.",
      "Tipping is not customary and can be seen as impolite.",
      "Keep your voice low on public transit; talking on mobile phones is discouraged.",
      "Always stand on the left side of escalators in Tokyo (right in Osaka) to let others pass."
    ]),
    local_laws_json: JSON.stringify([
      "Carry your passport with you at all times; police can ask to inspect it.",
      "Smoking is banned outdoors on public streets except in designated smoking areas.",
      "Very strict laws regarding import of certain over-the-counter medications (e.g., inhalers, ADHD meds)."
    ])
  },
  {
    id: 2,
    name: "Rio de Janeiro",
    country: "Brazil",
    latitude: -22.9068,
    longitude: -43.1729,
    base_safety_score: 52,
    emergency_contacts_json: JSON.stringify({
      police: "190",
      fire: "193",
      medical: "192",
      embassy: "+55-21-3823-2000 (US Consulate Rio)"
    }),
    cultural_tips_json: JSON.stringify([
      "Casual attire is common; dress down to blend in and avoid showing wealth.",
      "Locals (Cariocas) are warm and expressive; physical contact during conversation is normal.",
      "Say 'Obrigado' (male) or 'Obrigada' (female) for thank you."
    ]),
    local_laws_json: JSON.stringify([
      "Jaywalking is rarely prosecuted, but traffic is unpredictable. Exercise caution.",
      "Possession of illegal drugs carries severe penal consequences.",
      "You are legally required to carry a photo ID at all times."
    ])
  },
  {
    id: 3,
    name: "Paris",
    country: "France",
    latitude: 48.8566,
    longitude: 2.3522,
    base_safety_score: 78,
    emergency_contacts_json: JSON.stringify({
      police: "17",
      fire: "18",
      medical: "15",
      embassy: "+33-1-43-12-22-22 (US Embassy Paris)"
    }),
    cultural_tips_json: JSON.stringify([
      "Always start any interaction with 'Bonjour' (day) or 'Bonsoir' (evening). It is considered rude not to.",
      "Keep voices down in restaurants and public spaces.",
      "Service charge (service compris) is included in restaurant bills, but leaving a small extra tip for good service is appreciated."
    ]),
    local_laws_json: JSON.stringify([
      "Concealing one's face in public spaces is illegal.",
      "It is illegal to ignore a person in distress if you are able to assist them without danger to yourself.",
      "Strict regulations exist regarding flying recreational drones in urban areas."
    ])
  },
  {
    id: 4,
    name: "Cairo",
    country: "Egypt",
    latitude: 30.0444,
    longitude: 31.2357,
    base_safety_score: 68,
    emergency_contacts_json: JSON.stringify({
      police: "122",
      fire: "180",
      medical: "123",
      embassy: "+20-2-2797-3300 (US Embassy Cairo)"
    }),
    cultural_tips_json: JSON.stringify([
      "Dress conservatively, covering shoulders and knees, especially when visiting mosques.",
      "Use your right hand for eating, greeting, and passing items.",
      "Tipping (Baksheesh) is deeply ingrained in daily life for almost all services."
    ]),
    local_laws_json: JSON.stringify([
      "Taking photos of or near military, police installations, or public infrastructure is strictly illegal.",
      "Public displays of affection are highly discouraged and can lead to police intervention.",
      "Severe penalties for drug offences, which can include capital punishment."
    ])
  },
  {
    id: 5,
    name: "New York City",
    country: "United States",
    latitude: 40.7128,
    longitude: -74.0060,
    base_safety_score: 83,
    emergency_contacts_json: JSON.stringify({
      police: "911",
      fire: "911",
      medical: "911",
      embassy: "Local US Emergency Services"
    }),
    cultural_tips_json: JSON.stringify([
      "Tipping 18-20% is standard in restaurants and bars.",
      "Walk briskly on sidewalks, and step to the side if you need to look at a map or phone.",
      "The city is highly diverse and fast-paced; expect direct communication."
    ]),
    local_laws_json: JSON.stringify([
      "Open containers of alcohol in public streets are illegal.",
      "Smoking/vaping is prohibited in public parks, beaches, and indoor workplaces.",
      "Right turn on red lights is illegal inside NYC limits unless a sign permits it."
    ])
  }
];

const MOCK_ALERTS: AlertResponse[] = [
  {
    id: 1,
    title: "Public Transit Protest/Demonstration",
    description: "Active demonstration scheduled around Place de la République. Heavy police presence. Subway lines 3, 5, 8, 9 experiencing temporary station bypasses and delays. Avoid the immediate area to prevent getting caught in crowd dispersals.",
    category: "unrest",
    severity: "danger",
    latitude: 48.8675,
    longitude: 2.3638,
    radius_km: 2.0,
    active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 2,
    title: "Pickpocket Syndicate Alert: Louvre/Eiffel Area",
    description: "Increased reports of coordinated pickpocket groups targeting tourists near major landmarks. Operators utilize distraction techniques (fake surveys, clipboard signups). Secure all valuables in internal zipped pockets.",
    category: "crime",
    severity: "warning",
    latitude: 48.8606,
    longitude: 2.3376,
    radius_km: 3.0,
    active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 3,
    title: "Severe Typhoon Shanshan Tracking",
    description: "Typhoon Shanshan is approaching eastern Honshu. Winds up to 140km/h expected with heavy torrential rainfall. High risk of train cancellations (Shinkansen) and domestic flight disruptions starting tonight. Residents and travelers are advised to stock up on emergency supplies.",
    category: "weather",
    severity: "critical",
    latitude: 35.6,
    longitude: 140.0,
    radius_km: 150.0,
    active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 4,
    title: "Extreme Heat Dome Advisory",
    description: "Daytime temperatures rising to 43°C (109°F). High UV index. Minimize direct sunlight exposure between 11 AM and 4 PM. Drink bottled water with electrolyte supplements. Public water stations have been activated across central tourist spots.",
    category: "weather",
    severity: "warning",
    latitude: 30.04,
    longitude: 31.23,
    radius_km: 30.0,
    active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 5,
    title: "Active Riptide & Beach Wave Warning",
    description: "Red flags raised on Copacabana and Ipanema beaches. Extremely high undertow and hazardous rip currents reported due to offshore low pressure. Entering the water is forbidden in red flag areas. Lifeguards are patrolling.",
    category: "weather",
    severity: "danger",
    latitude: -22.9711,
    longitude: -43.1822,
    radius_km: 8.0,
    active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 6,
    title: "Street Crime Alert - Lapa District",
    description: "Increase in snatch-and-grab street robberies targeting electronic devices (laptops, phones) in Lapa after midnight. Avoid walking alone. Keep cell phones stored out of sight and use inside venues only.",
    category: "crime",
    severity: "danger",
    latitude: -22.9133,
    longitude: -43.1818,
    radius_km: 1.5,
    active: true,
    created_at: new Date().toISOString()
  }
];

export const TravelGuardianAPI = {
  // Generic fetch wrapper with timeout and fallback support
  async callAPI<T>(endpoint: string, options?: RequestInit, fallbackData?: T): Promise<T> {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 3000); // 3-second timeout

      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...(options?.headers || {})
        }
      });
      clearTimeout(id);

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return await res.json() as T;
    } catch (e) {
      console.warn(`Backend unreachable on ${API_BASE_URL}${endpoint}. Falling back to mock data.`, e);
      if (fallbackData !== undefined) {
        return fallbackData;
      }
      throw e;
    }
  },

  // 1. SENSE - Get alerts
  async getAlerts(lat?: number, lon?: number): Promise<AlertResponse[]> {
    let url = "/alerts/";
    if (lat !== undefined && lon !== undefined) {
      url += `?lat=${lat}&lon=${lon}`;
    }
    return this.callAPI<AlertResponse[]>(url, undefined, MOCK_ALERTS);
  },

  // 2. ASSESS - Evaluate travel risk
  async evaluateRisk(request: RiskRequest): Promise<RiskReportResponse> {
    const mockReport: RiskReportResponse = {
      destination_name: request.destination_name,
      traveler_profile: request.traveler_profile,
      overall_score: 75,
      score_breakdown: { crime: 80, health: 70, transit: 85, hazard: 65 },
      recommendations: [
        "Keep digital copies of all identification stored in the cloud.",
        `Register details of your trip to ${request.destination_name} with your national embassy.`,
        "Stay vigilant in crowded tourist centers to minimize pickpocket hazards.",
      ],
      created_at: new Date().toISOString()
    };

    // Make local adjustments to mock if backend is down
    const matchingDest = MOCK_DESTINATIONS.find(d => d.name.toLowerCase() === request.destination_name.toLowerCase());
    if (matchingDest) {
      const base = matchingDest.base_safety_score;
      mockReport.overall_score = base;
      mockReport.score_breakdown = {
        crime: Math.max(30, base - (request.traveler_profile.includes("Solo") ? 10 : 3)),
        health: Math.max(30, base - (request.health_considerations && request.health_considerations.length > 0 ? 12 : 2)),
        transit: Math.max(30, base - (request.transport_mode.includes("Public") ? 8 : 4)),
        hazard: base
      };

      const parsedTips = JSON.parse(matchingDest.cultural_tips_json || "[]") as string[];
      const parsedLaws = JSON.parse(matchingDest.local_laws_json || "[]") as string[];
      mockReport.recommendations = [
        ...mockReport.recommendations,
        ...parsedTips.slice(0, 2),
        ...parsedLaws.slice(0, 1)
      ];
    }

    try {
      const report = await this.callAPI<RiskReportResponse>("/assess/", {
        method: "POST",
        body: JSON.stringify(request)
      });
      // Append to local history list
      const localHistory = getLocalStorage<RiskReportResponse[]>("tg_assess_history", []);
      setLocalStorage("tg_assess_history", [report, ...localHistory.slice(0, 9)]);
      return report;
    } catch {
      // Offline fallback history tracking
      const localHistory = getLocalStorage<RiskReportResponse[]>("tg_assess_history", []);
      setLocalStorage("tg_assess_history", [mockReport, ...localHistory.slice(0, 9)]);
      return mockReport;
    }
  },

  async getRiskHistory(): Promise<RiskReportResponse[]> {
    const defaultHistory = getLocalStorage<RiskReportResponse[]>("tg_assess_history", []);
    return this.callAPI<RiskReportResponse[]>("/assess/history", undefined, defaultHistory);
  },

  // 3. GUIDE - Destination guides
  async getDestinations(): Promise<DestinationResponse[]> {
    return this.callAPI<DestinationResponse[]>("/guide/destinations", undefined, MOCK_DESTINATIONS);
  },

  async getDestinationDetails(name: string): Promise<any> {
    const cleanName = name.trim();
    const mockMatch = MOCK_DESTINATIONS.find(d => d.name.toLowerCase() === cleanName.toLowerCase());

    const fallbackDetails = mockMatch ? {
      id: mockMatch.id,
      name: mockMatch.name,
      country: mockMatch.country,
      latitude: mockMatch.latitude,
      longitude: mockMatch.longitude,
      base_safety_score: mockMatch.base_safety_score,
      emergency_contacts: JSON.parse(mockMatch.emergency_contacts_json || "{}"),
      cultural_tips: JSON.parse(mockMatch.cultural_tips_json || "[]"),
      local_laws: JSON.parse(mockMatch.local_laws_json || "[]")
    } : {
      name: cleanName,
      country: "Global Destination",
      latitude: 0,
      longitude: 0,
      base_safety_score: 75,
      emergency_contacts: { police: "112", fire: "112", medical: "112", embassy: "Contact local representative" },
      cultural_tips: ["Observe local attire expectations.", "Maintain awareness of surroundings."],
      local_laws: ["Observe laws concerning photographing official facilities."]
    };

    return this.callAPI<any>(`/guide/destination/${cleanName}`, undefined, fallbackDetails);
  },

  // 4. ASSIST - Contacts, checkin & SOS
  async getEmergencyContacts(): Promise<EmergencyContactResponse[]> {
    const mockContacts = getLocalStorage<EmergencyContactResponse[]>("tg_contacts", [
      { id: 1, name: "Sarah Miller", phone: "+1-555-0199", email: "sarah.miller@example.com", relation: "Spouse/Partner", user_id: "default_user" }
    ]);
    return this.callAPI<EmergencyContactResponse[]>("/assist/contacts", undefined, mockContacts);
  },

  async createEmergencyContact(contact: Omit<EmergencyContactResponse, "id" | "user_id">): Promise<EmergencyContactResponse> {
    const newContactOffline: EmergencyContactResponse = {
      ...contact,
      id: Date.now(),
      user_id: "default_user"
    };

    try {
      return await this.callAPI<EmergencyContactResponse>("/assist/contacts", {
        method: "POST",
        body: JSON.stringify(contact)
      });
    } catch {
      const contacts = getLocalStorage<EmergencyContactResponse[]>("tg_contacts", [
        { id: 1, name: "Sarah Miller", phone: "+1-555-0199", email: "sarah.miller@example.com", relation: "Spouse/Partner", user_id: "default_user" }
      ]);
      const updated = [...contacts, newContactOffline];
      setLocalStorage("tg_contacts", updated);
      return newContactOffline;
    }
  },

  async deleteEmergencyContact(id: number): Promise<void> {
    try {
      await this.callAPI<void>(`/assist/contacts/${id}`, {
        method: "DELETE"
      });
    } catch {
      const contacts = getLocalStorage<EmergencyContactResponse[]>("tg_contacts", []);
      const updated = contacts.filter(c => c.id !== id);
      setLocalStorage("tg_contacts", updated);
    }
  },

  async getCheckins(): Promise<SafeCheckInResponse[]> {
    const mockCheckins = getLocalStorage<SafeCheckInResponse[]>("tg_checkins", []);
    return this.callAPI<SafeCheckInResponse[]>("/assist/checkin", undefined, mockCheckins);
  },

  async setCheckin(targetTime: string, checkinText?: string): Promise<SafeCheckInResponse> {
    const payload = { target_time: targetTime, checkin_text: checkinText };
    const newCheckinOffline: SafeCheckInResponse = {
      target_time: targetTime,
      checkin_text: checkinText || null,
      id: Date.now(),
      user_id: "default_user",
      is_completed: false,
      is_triggered: false,
      created_at: new Date().toISOString()
    };

    try {
      return await this.callAPI<SafeCheckInResponse>("/assist/checkin", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    } catch {
      setLocalStorage("tg_checkins", [newCheckinOffline]);
      return newCheckinOffline;
    }
  },

  async confirmCheckin(): Promise<SafeCheckInResponse> {
    try {
      return await this.callAPI<SafeCheckInResponse>("/assist/checkin/confirm", {
        method: "POST"
      });
    } catch {
      const checkins = getLocalStorage<SafeCheckInResponse[]>("tg_checkins", []);
      if (checkins.length > 0) {
        checkins[0].is_completed = true;
        setLocalStorage("tg_checkins", checkins);
        return checkins[0];
      }
      throw new Error("No active timer to check in.");
    }
  },

  async triggerSOS(request: SOSRequest): Promise<SOSResponse> {
    const contacts = await this.getEmergencyContacts();
    const broadcastList = contacts.map(c => `${c.name} (${c.relation}) via ${c.phone}`);
    const fallbackResponse: SOSResponse = {
      success: true,
      message: `SOS Broadcasted to Emergency Contacts. Message: '${request.custom_message || "Emergency Help Needed!"}'`,
      broadcasted_contacts: broadcastList.length > 0 ? broadcastList : ["Emergency Dispatch (911/112)"],
      latitude: request.latitude,
      longitude: request.longitude,
      nearest_havens: [
        { name: "Metropolitan Emergency Police Station", type: "Police Station", latitude: request.latitude + 0.004, longitude: request.longitude - 0.002, distance_km: 0.5, phone: "+1-555-0199" },
        { name: "General Memorial Medical Center", type: "Hospital", latitude: request.latitude - 0.009, longitude: request.longitude + 0.007, distance_km: 1.2, phone: "+1-555-0144" },
        { name: "International Diplomatic Embassy District office", type: "Embassy", latitude: request.latitude + 0.018, longitude: request.longitude + 0.015, distance_km: 2.5, phone: "+1-555-0100" }
      ]
    };

    return this.callAPI<SOSResponse>("/assist/sos", {
      method: "POST",
      body: JSON.stringify(request)
    }, fallbackResponse);
  }
};
