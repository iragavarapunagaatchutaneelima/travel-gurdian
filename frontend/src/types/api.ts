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
}

export interface SafeCheckInResponse {
  id: number;
  user_id: string;
  target_time: string;
  checkin_text: string | null;
  is_completed: boolean;
  is_triggered: boolean;
  created_at: string;
}

export interface SOSRequest {
  latitude: number;
  longitude: number;
  custom_message?: string;
}

export interface SafeHaven {
  name: string;
  type: string; // Hospital, Police Station, Embassy
  latitude: number;
  longitude: number;
  distance_km: number;
  phone: string;
}

export interface SOSResponse {
  success: boolean;
  message: string;
  broadcasted_contacts: string[];
  latitude: number;
  longitude: number;
  nearest_havens: SafeHaven[];
}
