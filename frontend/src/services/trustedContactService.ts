import { TrustedContact } from "../types/safetyCheckIn";
import { TravelGuardianAPI } from "./api";

const STORAGE_KEY = "tg_trusted_contacts";
export const MIN_TRUSTED_CONTACTS = 0;
export const MAX_TRUSTED_CONTACTS = 5;

/**
 * Fetches the authoritative trusted-contact list from the backend database
 * and refreshes the local cache. Every screen that shows or relies on
 * trusted contacts (Emergency, Map, Settings, Assist, Safety Check-In)
 * should call this on mount instead of reading only the localStorage cache,
 * so a contact added/edited/removed on one screen is reflected everywhere
 * else -- the backend is the single source of truth, not whichever screen
 * happened to sync last.
 *
 * Throws on backend failure so callers can decide how to surface it
 * (falling back to the last-known cache is a reasonable degraded mode, but
 * that decision belongs to the caller, not this function).
 */
export async function refreshTrustedContactsFromBackend(): Promise<TrustedContact[]> {
  const backendContacts = await TravelGuardianAPI.getEmergencyContacts();
  const mapped: TrustedContact[] = backendContacts
    .slice()
    .sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) || a.id - b.id)
    .map((bc) => ({
      id: `tc_${bc.id}`,
      backendId: bc.id,
      name: bc.name,
      phone: bc.phone,
      relationship: bc.relation,
      enabled: bc.is_enabled !== undefined ? bc.is_enabled : true,
      createdAt: Date.now()
    }));
  saveTrustedContacts(mapped);
  return mapped;
}

export function getTrustedContacts(): TrustedContact[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (err) {
    console.warn("Failed to load trusted contacts from localStorage", err);
    return [];
  }
}

export function saveTrustedContacts(contacts: TrustedContact[]): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
    return true;
  } catch (err) {
    console.error("Failed to save trusted contacts to localStorage", err);
    return false;
  }
}

export function validatePhoneNumber(phone: string): { valid: boolean; formatted: string; error?: string } {
  if (!phone || typeof phone !== "string") {
    return { valid: false, formatted: "", error: "Phone number is required." };
  }

  const trimmed = phone.trim();
  const cleaned = trimmed.replace(/[^\d+]/g, "");
  if (!cleaned) {
    return { valid: false, formatted: "", error: "Phone number contains no valid digits." };
  }

  const digits = cleaned.replace(/\+/g, "");
  if (digits.length < 10 || digits.length > 15) {
    return { valid: false, formatted: cleaned, error: `Phone number must be between 10 and 15 digits (got ${digits.length}).` };
  }

  // Reject repeating digits
  if (new Set(digits).size === 1) {
    return { valid: false, formatted: cleaned, error: "Phone number cannot consist of identical repeating digits." };
  }

  // Reject emergency shortcodes
  const shortcodes = ["112", "911", "100", "101", "102", "108", "999"];
  if (shortcodes.includes(digits)) {
    return { valid: false, formatted: cleaned, error: `${digits} is a national emergency service number and cannot be a personal contact.` };
  }

  // Reject fictional 555 numbers
  if (digits.startsWith("555") || digits.includes("55501") || digits.includes("155501")) {
    return { valid: false, formatted: cleaned, error: "Fictional 555 numbers are not permitted for live emergency dispatch." };
  }

  // Auto-format 10-digit Indian numbers starting with 6-9
  if (!cleaned.startsWith("+") && cleaned.length === 10 && "6789".includes(cleaned[0])) {
    return { valid: true, formatted: `+91${cleaned}` };
  }

  if (cleaned.startsWith("+")) {
    if (digits.startsWith("0")) {
      return { valid: false, formatted: cleaned, error: "Country code cannot start with 0." };
    }
    return { valid: true, formatted: cleaned };
  }

  return { valid: true, formatted: `+${cleaned}` };
}

export function addTrustedContact(
  contact: Omit<TrustedContact, "id" | "createdAt"> & { backendId?: number }
): { success: boolean; contact?: TrustedContact; error?: string } {
  const current = getTrustedContacts();
  if (current.length >= MAX_TRUSTED_CONTACTS) {
    return { 
      success: false, 
      error: `Maximum ${MAX_TRUSTED_CONTACTS} trusted contacts allowed.` 
    };
  }

  const trimmedName = contact.name.trim();
  if (!trimmedName) {
    return { success: false, error: "Contact name cannot be blank." };
  }

  const phoneValidation = validatePhoneNumber(contact.phone);
  if (!phoneValidation.valid) {
    return { success: false, error: phoneValidation.error };
  }

  // Check duplicate phone locally
  const duplicate = current.find(c => c.phone === phoneValidation.formatted);
  if (duplicate) {
    return { success: false, error: "A contact with this phone number already exists." };
  }

  const newContact: TrustedContact = {
    id: contact.backendId ? `tc_${contact.backendId}` : `tc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    backendId: contact.backendId,
    name: trimmedName,
    phone: phoneValidation.formatted,
    relationship: contact.relationship?.trim() || "Contact",
    enabled: contact.enabled !== undefined ? contact.enabled : true,
    createdAt: Date.now()
  };

  const updated = [...current, newContact];
  saveTrustedContacts(updated);
  return { success: true, contact: newContact };
}

export function updateTrustedContact(
  id: string,
  updates: Partial<Omit<TrustedContact, "id" | "createdAt">>
): { success: boolean; contact?: TrustedContact; error?: string } {
  const current = getTrustedContacts();
  const index = current.findIndex(c => c.id === id || (updates.backendId && c.backendId === updates.backendId));
  if (index === -1) {
    return { success: false, error: "Contact not found." };
  }

  if (updates.name !== undefined && !updates.name.trim()) {
    return { success: false, error: "Contact name cannot be blank." };
  }

  let validatedPhone: string | undefined;
  if (updates.phone !== undefined) {
    const phoneValidation = validatePhoneNumber(updates.phone);
    if (!phoneValidation.valid) {
      return { success: false, error: phoneValidation.error };
    }
    validatedPhone = phoneValidation.formatted;

    // Check duplicate against other contacts
    const duplicate = current.find(c => c.id !== current[index].id && c.phone === validatedPhone);
    if (duplicate) {
      return { success: false, error: "Another contact already has this phone number." };
    }
  }

  const updatedContact: TrustedContact = {
    ...current[index],
    ...updates,
    backendId: updates.backendId !== undefined ? updates.backendId : current[index].backendId,
    phone: validatedPhone || current[index].phone,
    name: updates.name ? updates.name.trim() : current[index].name,
    relationship: updates.relationship !== undefined ? updates.relationship.trim() : current[index].relationship,
    enabled: updates.enabled !== undefined ? updates.enabled : current[index].enabled
  };

  current[index] = updatedContact;
  saveTrustedContacts(current);
  return { success: true, contact: updatedContact };
}

export function removeTrustedContact(id: string): { success: boolean; error?: string } {
  const current = getTrustedContacts();
  const filtered = current.filter(c => c.id !== id);
  if (filtered.length === current.length) {
    return { success: false, error: "Contact not found." };
  }

  saveTrustedContacts(filtered);
  return { success: true };
}

export function toggleContactEnabled(id: string): { success: boolean; contact?: TrustedContact; error?: string } {
  const current = getTrustedContacts();
  const contact = current.find(c => c.id === id);
  if (!contact) {
    return { success: false, error: "Contact not found." };
  }

  const nextEnabled = !contact.enabled;
  return updateTrustedContact(id, { enabled: nextEnabled });
}
