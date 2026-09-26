// Travel Guardian Frontend API Service with graceful mock fallback
import { 
  type AlertResponse, 
  type RiskRequest, 
  type RiskReportResponse, 
  type DestinationResponse, 
  type EmergencyContactResponse, 
  type SafeCheckInResponse, 
  type SOSRequest, 
  type SOSResponse,
  type EmergencyActionParams,
  type EmergencySMSResponse,
  type EmergencyCallResponse,
  type EmergencyNotificationResponse,
  type SchedulerStatusResponse
} from "../types/api";


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
  async callAPI<T>(endpoint: string, options?: RequestInit, fallbackData?: T, timeoutMs: number = 6000): Promise<T> {
    try {
      const isEmergencyEndpoint = endpoint.includes("/emergency/") || endpoint.includes("/sos");
      const effectiveTimeout = isEmergencyEndpoint ? Math.max(timeoutMs, 15000) : timeoutMs;
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), effectiveTimeout);

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
        const errJson = await res.json().catch(() => null);
        const detailMsg = errJson?.detail || errJson?.message || `HTTP error! status: ${res.status}`;
        const err: any = new Error(detailMsg);
        err.status = res.status;
        err.detail = detailMsg;
        throw err;
      }
      return await res.json() as T;
    } catch (e: any) {
      if (fallbackData !== undefined) {
        console.warn(`Backend unreachable on ${API_BASE_URL}${endpoint}. Falling back to mock data.`, e);
        if (typeof fallbackData === "object" && fallbackData !== null) {
          const detail = e?.detail || e?.message;
          if (detail && !detail.includes("abort")) {
            (fallbackData as any).safe_message = `Emergency communication failed: ${detail}`;
            (fallbackData as any).error = detail;
          }
        }
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

  // 4. ASSIST - Contacts, checkin & SOS (Source of Truth: Backend)
  async getEmergencyContacts(): Promise<EmergencyContactResponse[]> {
    // Backend is the source of truth; no fake default contacts
    return this.callAPI<EmergencyContactResponse[]>("/assist/contacts");
  },

  async createEmergencyContact(contact: Omit<EmergencyContactResponse, "id" | "user_id">): Promise<EmergencyContactResponse> {
    return this.callAPI<EmergencyContactResponse>("/assist/contacts", {
      method: "POST",
      body: JSON.stringify(contact)
    });
  },

  async updateEmergencyContact(id: number, contact: Partial<Omit<EmergencyContactResponse, "id" | "user_id">>): Promise<EmergencyContactResponse> {
    return this.callAPI<EmergencyContactResponse>(`/assist/contacts/${id}`, {
      method: "PUT",
      body: JSON.stringify(contact)
    });
  },

  async deleteEmergencyContact(id: number): Promise<void> {
    const controller = new AbortController();
    const idTimer = setTimeout(() => controller.abort(), 4000);
    try {
      const res = await fetch(`${API_BASE_URL}/assist/contacts/${id}`, {
        method: "DELETE",
        signal: controller.signal
      });
      clearTimeout(idTimer);
      if (!res.ok && res.status !== 404) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.detail || `Failed to delete contact (HTTP ${res.status})`);
      }
    } catch (e) {
      clearTimeout(idTimer);
      throw e;
    }
  },

  async getCheckins(): Promise<SafeCheckInResponse[]> {
    const mockCheckins = getLocalStorage<SafeCheckInResponse[]>("tg_checkins", []);
    return this.callAPI<SafeCheckInResponse[]>("/assist/checkin", undefined, mockCheckins);
  },

  async getActiveCheckin(): Promise<SafeCheckInResponse | null> {
    try {
      return await this.callAPI<SafeCheckInResponse>("/assist/checkin/active");
    } catch {
      const checkins = getLocalStorage<SafeCheckInResponse[]>("tg_checkins", []);
      const active = checkins.find(c => !c.is_completed);
      return active || null;
    }
  },

  async setCheckin(
    targetTime: string,
    checkinText?: string,
    lat?: number,
    lon?: number
  ): Promise<SafeCheckInResponse> {
    const payload = {
      target_time: targetTime,
      checkin_text: checkinText || null,
      latitude: lat !== undefined ? lat : null,
      longitude: lon !== undefined ? lon : null
    };
    const newCheckinOffline: SafeCheckInResponse = {
      target_time: targetTime,
      checkin_text: checkinText || null,
      id: Date.now(),
      user_id: "default_user",
      is_completed: false,
      is_triggered: false,
      escalation_status: "pending",
      last_known_latitude: lat || null,
      last_known_longitude: lon || null,
      created_at: new Date().toISOString()
    };

    try {
      const result = await this.callAPI<SafeCheckInResponse>("/assist/checkin", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      setLocalStorage("tg_checkins", [result]);
      return result;
    } catch {
      setLocalStorage("tg_checkins", [newCheckinOffline]);
      return newCheckinOffline;
    }
  },

  async confirmCheckin(): Promise<SafeCheckInResponse> {
    try {
      const result = await this.callAPI<SafeCheckInResponse>("/assist/checkin/confirm", {
        method: "POST"
      });
      setLocalStorage("tg_checkins", []);
      return result;
    } catch {
      const checkins = getLocalStorage<SafeCheckInResponse[]>("tg_checkins", []);
      if (checkins.length > 0) {
        checkins[0].is_completed = true;
        checkins[0].escalation_status = "confirmed_safe";
        setLocalStorage("tg_checkins", checkins);
        return checkins[0];
      }
      throw new Error("No active timer to check in.");
    }
  },

  async cancelCheckin(): Promise<SafeCheckInResponse> {
    try {
      const result = await this.callAPI<SafeCheckInResponse>("/assist/checkin/cancel", {
        method: "POST"
      });
      setLocalStorage("tg_checkins", []);
      return result;
    } catch {
      const checkins = getLocalStorage<SafeCheckInResponse[]>("tg_checkins", []);
      if (checkins.length > 0) {
        checkins[0].is_completed = true;
        checkins[0].escalation_status = "cancelled";
        setLocalStorage("tg_checkins", checkins);
        return checkins[0];
      }
      throw new Error("No active timer to cancel.");
    }
  },

  async updateCheckinLocation(latitude: number, longitude: number): Promise<SafeCheckInResponse> {
    return await this.callAPI<SafeCheckInResponse>("/assist/checkin/location", {
      method: "POST",
      body: JSON.stringify({ latitude, longitude })
    });
  },

  async checkOverdueCheckins(): Promise<SafeCheckInResponse[]> {
    return await this.callAPI<SafeCheckInResponse[]>("/assist/checkin/check-overdue", {
      method: "POST"
    });
  },

  async getSchedulerStatus(): Promise<SchedulerStatusResponse> {
    return await this.callAPI<SchedulerStatusResponse>("/assist/checkin/scheduler-status");
  },

  async triggerSOS(request: SOSRequest): Promise<SOSResponse> {
    const contacts = await this.getEmergencyContacts();
    const broadcastList = contacts.map(c => `${c.name} (${c.relation}) via ${c.phone}`);
    const fallbackResponse: SOSResponse = {
      success: false,
      message: "Emergency broadcast network offline. Live telemetry could not be dispatched via Exotel. Please call 112 directly if in immediate danger.",
      broadcasted_contacts: broadcastList.length > 0 ? broadcastList : ["Emergency Dispatch Hotline (112)"],
      latitude: request.latitude,
      longitude: request.longitude,
      nearest_havens: [
        { name: "National Emergency Response Center (Police, Medical, Fire, Disaster)", type: "National Emergency Service", phone: "112", is_verified: true, is_demo: false, data_source: "Emergency Response Support System (ERSS 112)", note: "Unified 24/7 national emergency response line. Primary fail-safe lifeline." },
        { name: "National Ambulance & Medical Trauma Dispatch", type: "Medical Emergency / Hospital", phone: "108", is_verified: true, is_demo: false, data_source: "National Health Mission (108 Ambulance)", note: "24/7 emergency medical dispatch and hospital triage network." },
        { name: "Police Emergency Control Room", type: "Police Department", phone: "100", is_verified: true, is_demo: false, data_source: "National Police Service (100 PCR)", note: "Direct police emergency dispatch for immediate safety protection." }
      ],
      sms_status: "failed",
      call_status: "failed",
      overall_status: "failed"
    };

    return this.callAPI<SOSResponse>("/assist/sos", {
      method: "POST",
      body: JSON.stringify(request)
    }, fallbackResponse);
  },

  // 5. EXOTEL EMERGENCY COMMUNICATION (Strict destination restriction: Trusted Contact only)
  async sendEmergencySMS(params: EmergencyActionParams): Promise<EmergencySMSResponse> {
    const fallbackResponse: EmergencySMSResponse = {
      success: false,
      status: "failed",
      message: "Emergency SMS could not be sent.",
      safe_message: "Backend emergency service unreachable. Please dial 112 directly if in immediate danger.",
      error: "Service unavailable"
    };

    return this.callAPI<EmergencySMSResponse>("/emergency/sms", {
      method: "POST",
      body: JSON.stringify(params)
    }, fallbackResponse);
  },

  async makeEmergencyCall(params: EmergencyActionParams): Promise<EmergencyCallResponse> {
    const fallbackResponse: EmergencyCallResponse = {
      success: false,
      status: "failed",
      message: "Emergency call could not be initiated.",
      safe_message: "Backend emergency voice service unreachable. Please dial 112 directly if in immediate danger.",
      error: "Service unavailable"
    };

    return this.callAPI<EmergencyCallResponse>("/emergency/call", {
      method: "POST",
      body: JSON.stringify(params)
    }, fallbackResponse);
  },

  async notifyTrustedContact(params: EmergencyActionParams): Promise<EmergencyNotificationResponse> {
    const fallbackResponse: EmergencyNotificationResponse = {
      success: false,
      overall_status: "failed",
      sms_status: "failed",
      call_status: "failed",
      message: "Emergency communication failed.",
      safe_message: "Backend emergency service unreachable. Please dial 112 directly if in immediate danger.",
      timestamp: new Date().toISOString()
    };

    return this.callAPI<EmergencyNotificationResponse>("/emergency/notify-trusted-contact", {
      method: "POST",
      body: JSON.stringify(params)
    }, fallbackResponse);
  },

  async getExotelConfigStatus(): Promise<{ is_configured: boolean }> {
    return this.callAPI<{ is_configured: boolean }>("/emergency/config-status", undefined, { is_configured: false });
  }
};

