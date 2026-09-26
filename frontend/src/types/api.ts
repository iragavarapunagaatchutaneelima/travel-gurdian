export interface DestinationResponse {
  id: number;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  base_safety_score: number;
  emergency_contacts_json?: string;
  cultural_tips_json?: string;
  local_laws_json?: string;
}

export interface AlertResponse {
  id: number;
  title: string;
  description: string;
  category: string; // weather, crime, health, unrest
  severity: string; // info, warning, danger, critical
  latitude: number;
  longitude: number;
  radius_km: number;
  active: boolean;
  created_at: string;
}

export interface RiskRequest {
  destination_name: string;
  traveler_profile: string;
  transport_mode: string;
  health_considerations?: string[];
  demographics?: string;
}

export interface RiskReportResponse {
  id?: number;
  destination_name: string;
  traveler_profile: string;
  overall_score: number;
  score_breakdown: {
    crime: number;
    health: number;
    transit: number;
    hazard: number;
  };
  recommendations: string[];
  created_at: string;
}

export interface EmergencyContactResponse {
  id: number;
  name: string;
  phone: string;
  email?: string | null;
  relation: string;
  user_id: string;
  is_enabled: boolean;
}

export interface SafeCheckInResponse {
  id: number;
  user_id: string;
  target_time: string;
  checkin_text: string | null;
  is_completed: boolean;
  is_triggered: boolean;
  created_at: string;
  last_known_latitude?: number | null;
  last_known_longitude?: number | null;
  last_location_time?: string | null;
  escalation_status: string; // pending, confirmed_safe, escalating, escalated, exotel_failure, no_trusted_contact, cancelled
  dispatched_at?: string | null;
  dispatch_sms_sid?: string | null;
  dispatch_call_sid?: string | null;
  dispatch_recipient_name?: string | null;
  dispatch_recipient_phone?: string | null;
  dispatch_error?: string | null;
  idempotency_key?: string | null;
}

export interface SchedulerStatusResponse {
  is_running: boolean;
  poll_interval_seconds: number;
  last_poll_at?: string | null;
  total_evaluations: number;
  total_escalations: number;
  active_pending_count: number;
  server_time: string;
}

export interface SOSRequest {
  latitude: number;
  longitude: number;
  custom_message?: string;
}

export interface SafeHaven {
  name: string;
  type: string; // Hospital, Police Station, National Emergency
  latitude?: number;
  longitude?: number;
  distance_km?: number;
  phone: string;
  is_verified?: boolean;
  is_demo?: boolean;
  data_source?: string;
  note?: string;
}

export interface SOSResponse {
  success: boolean;
  message: string;
  broadcasted_contacts: string[];
  latitude: number;
  longitude: number;
  nearest_havens: SafeHaven[];
  sms_status?: "sent" | "failed" | "pending" | "throttled" | "skipped" | "dry_run";
  call_status?: "initiated" | "failed" | "pending" | "throttled" | "skipped" | "dry_run";
  overall_status?: "completed" | "partially_completed" | "failed" | "pending" | "throttled" | "no_trusted_contact" | "dry_run";
  recipient_name?: string;
  recipient_phone_masked?: string;
  transaction_id?: string | null;
}

export interface EmergencyActionParams {
  latitude?: number;
  longitude?: number;
  custom_message?: string;
  location_name?: string;
  voice_message?: string;
  include_sms?: boolean;
  include_call?: boolean;
  contact_name?: string;
  contact_phone?: string;
  contact_relation?: string;
}


export interface EmergencySMSResponse {
  success: boolean;
  status: "sent" | "failed" | "pending" | "dry_run";
  message: string;
  safe_message?: string;
  recipient_name?: string;
  recipient_phone_masked?: string;
  sid?: string | null;
  error?: string | null;
}

export interface EmergencyCallResponse {
  success: boolean;
  status: "initiated" | "failed" | "pending" | "dry_run";
  message: string;
  safe_message?: string;
  recipient_name?: string;
  recipient_phone_masked?: string;
  sid?: string | null;
  error?: string | null;
}

export interface EmergencyNotificationResponse {
  success: boolean;
  overall_status: "completed" | "partially_completed" | "failed" | "pending" | "dry_run";
  sms_status: "sent" | "failed" | "pending" | "skipped" | "dry_run";
  call_status: "initiated" | "failed" | "pending" | "skipped" | "dry_run";
  message: string;
  safe_message?: string;
  recipient_name?: string;
  recipient_phone_masked?: string;
  sms_sid?: string | null;
  call_sid?: string | null;
  timestamp: string;
}

