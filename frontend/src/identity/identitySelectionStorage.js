import {
  IDENTITY_CONFIG_BY_ID,
  OTHER_IDENTITY_ID,
  PREFER_NOT_TO_SAY_ID,
} from "./identityConfig";

export const ONBOARDING_IDENTITY_KEY = "marakah_onboarding_identity_selection_v1";

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeIds(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set();
  const ids = [];
  for (const item of value) {
    const id = normalizeString(item);
    if (!IDENTITY_CONFIG_BY_ID[id] || seen.has(id)) {
      continue;
    }
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

function normalizeCustomList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set();
  const list = [];

  for (const item of value) {
    const cleaned = normalizeString(item).replace(/\s+/g, " ");
    const lowered = cleaned.toLowerCase();
    if (!cleaned || seen.has(lowered)) {
      continue;
    }
    seen.add(lowered);
    list.push(cleaned);
  }

  return list;
}

export function sanitizeIdentitySelection(rawValue) {
  const raw = rawValue && typeof rawValue === "object" ? rawValue : {};
  let ethnicityIds = normalizeIds(raw.ethnicityIds);
  const preferNotToSay = Boolean(raw.preferNotToSay);

  if (preferNotToSay) {
    ethnicityIds = [PREFER_NOT_TO_SAY_ID];
  }

  if (ethnicityIds.includes(PREFER_NOT_TO_SAY_ID) && ethnicityIds.length > 1) {
    ethnicityIds = [PREFER_NOT_TO_SAY_ID];
  }

  let customEthnicities = normalizeCustomList(raw.customEthnicities);

  if (!ethnicityIds.includes(OTHER_IDENTITY_ID)) {
    customEthnicities = [];
  }

  return {
    ethnicityIds,
    customEthnicities,
    preferNotToSay: ethnicityIds.includes(PREFER_NOT_TO_SAY_ID),
  };
}

export function readOnboardingIdentitySelection() {
  if (typeof window === "undefined") {
    return sanitizeIdentitySelection({});
  }

  try {
    const raw = window.localStorage.getItem(ONBOARDING_IDENTITY_KEY);
    if (!raw) {
      return sanitizeIdentitySelection({});
    }

    return sanitizeIdentitySelection(JSON.parse(raw));
  } catch {
    return sanitizeIdentitySelection({});
  }
}

export function saveOnboardingIdentitySelection(value) {
  if (typeof window === "undefined") {
    return;
  }

  const safeValue = sanitizeIdentitySelection(value);
  window.localStorage.setItem(ONBOARDING_IDENTITY_KEY, JSON.stringify(safeValue));
}

export function clearOnboardingIdentitySelection() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(ONBOARDING_IDENTITY_KEY);
}
