import { TrustedContact } from "../types/safetyCheckIn";

const STORAGE_KEY = "tg_trusted_contacts";
export const MIN_TRUSTED_CONTACTS = 1;
export const MAX_TRUSTED_CONTACTS = 5;

const DEFAULT_CONTACTS: TrustedContact[] = [];

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
  const cleaned = phone.replace(/[^0-9+]/g, "").trim();
  if (!cleaned) {
    return { valid: false, formatted: "", error: "Phone number is required." };
  }
  // Check minimal length (e.g. 10 digits or with +91)
  const digits = cleaned.replace(/[^0-9]/g, "");
  if (digits.length < 10 || digits.length > 15) {
    return { valid: false, formatted: cleaned, error: "Please enter a valid 10-15 digit phone number." };
  }
  return { valid: true, formatted: cleaned };
}

export function addTrustedContact(
  contact: Omit<TrustedContact, "id" | "createdAt">
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

  const newContact: TrustedContact = {
    id: `tc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
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
  const index = current.findIndex(c => c.id === id);
  if (index === -1) {
    return { success: false, error: "Contact not found." };
  }

  if (updates.name !== undefined && !updates.name.trim()) {
    return { success: false, error: "Contact name cannot be blank." };
  }

  if (updates.phone !== undefined) {
    const phoneValidation = validatePhoneNumber(updates.phone);
    if (!phoneValidation.valid) {
      return { success: false, error: phoneValidation.error };
    }
    updates.phone = phoneValidation.formatted;
  }

  const updatedContact = {
    ...current[index],
    ...updates,
    name: updates.name ? updates.name.trim() : current[index].name,
    relationship: updates.relationship !== undefined ? updates.relationship.trim() : current[index].relationship
  };

  current[index] = updatedContact;
  saveTrustedContacts(current);
  return { success: true, contact: updatedContact };
}

export function removeTrustedContact(id: string): { success: boolean; error?: string } {
  const current = getTrustedContacts();
  if (current.length <= MIN_TRUSTED_CONTACTS) {
    return { 
      success: false, 
      error: `At least ${MIN_TRUSTED_CONTACTS} trusted contact must remain configured.` 
    };
  }

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
  // Ensure at least 1 contact remains enabled if possible
  const activeCount = current.filter(c => c.enabled).length;
  if (!nextEnabled && activeCount <= 1) {
    return { success: false, error: "At least one trusted contact must remain active." };
  }

  return updateTrustedContact(id, { enabled: nextEnabled });
}
