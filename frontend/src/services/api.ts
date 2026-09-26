// Travel Guardian Frontend API Service.
// Talks to the FastAPI backend exclusively through the same-origin
// /backend-api proxy (see next.config.ts rewrites()) so the strict CSP
// connect-src never needs to name the backend's real origin. Never falls
// back to fabricated/mock data presented as if it were live: on failure,
// callers get an honest error (or, for a handful of read endpoints, an
// empty result) instead of invented alerts, destinations, or risk scores.
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


// Relative, same-origin path. Proxied to the real (server-only)
// BACKEND_API_URL by the Next.js rewrite in next.config.ts.
const API_BASE_URL = "/backend-api";

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

  // 1. SENSE - Get alerts. No fallback: if the backend is unreachable, the
  // caller gets an honest error rather than fabricated Paris/Tokyo/Rio
  // "live" alerts.
  async getAlerts(lat?: number, lon?: number): Promise<AlertResponse[]> {
    let url = "/alerts/";
    if (lat !== undefined && lon !== undefined) {
      url += `?lat=${lat}&lon=${lon}`;
    }
    return this.callAPI<AlertResponse[]>(url);
  },

  // 2. ASSESS - Evaluate travel risk. No client-computed fallback score: a
  // failed request must not be silently replaced with a fabricated risk
  // report presented as real.
  async evaluateRisk(request: RiskRequest): Promise<RiskReportResponse> {
    const report = await this.callAPI<RiskReportResponse>("/assess/", {
      method: "POST",
      body: JSON.stringify(request)
    });
    const localHistory = getLocalStorage<RiskReportResponse[]>("tg_assess_history", []);
    setLocalStorage("tg_assess_history", [report, ...localHistory.slice(0, 9)]);
    return report;
  },

  async getRiskHistory(): Promise<RiskReportResponse[]> {
    return this.callAPI<RiskReportResponse[]>("/assess/history");
  },

  // 3. GUIDE - Destination guides. No fallback: an unreachable backend
  // surfaces as an error instead of fabricated destination data.
  async getDestinations(): Promise<DestinationResponse[]> {
    return this.callAPI<DestinationResponse[]>("/guide/destinations");
  },

  async getDestinationDetails(name: string): Promise<any> {
    const cleanName = name.trim();
    return this.callAPI<any>(`/guide/destination/${cleanName}`);
  },

  // 4. ASSIST - Contacts, checkin & SOS (Source of Truth: Backend)
  async getEmergencyContacts(): Promise<EmergencyContactResponse[]> {
    // Backend is the source of truth; no fake default contacts
    return this.callAPI<EmergencyContactResponse[]>("/assist/contacts");
  },

  async createEmergencyContact(contact: Omit<EmergencyContactResponse, "id" | "user_id" | "is_primary">): Promise<EmergencyContactResponse> {
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

  // Check-in state is the Dead-Man's-Switch timer: it must never be
  // fabricated client-side. If the backend is unreachable, every one of
  // these throws instead of returning a fake locally-invented timer that
  // would make the UI claim the switch is armed when it is not.
  async getCheckins(): Promise<SafeCheckInResponse[]> {
    return this.callAPI<SafeCheckInResponse[]>("/assist/checkin");
  },

  async getActiveCheckin(): Promise<SafeCheckInResponse | null> {
    try {
      return await this.callAPI<SafeCheckInResponse>("/assist/checkin/active");
    } catch (e: any) {
      if (e?.status === 404) {
        return null;
      }
      throw e;
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
    return this.callAPI<SafeCheckInResponse>("/assist/checkin", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  async confirmCheckin(): Promise<SafeCheckInResponse> {
    return this.callAPI<SafeCheckInResponse>("/assist/checkin/confirm", {
      method: "POST"
    });
  },

  async cancelCheckin(): Promise<SafeCheckInResponse> {
    return this.callAPI<SafeCheckInResponse>("/assist/checkin/cancel", {
      method: "POST"
    });
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

