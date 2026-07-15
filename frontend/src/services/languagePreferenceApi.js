import { DEFAULT_LANGUAGE, normalizeLanguage } from "../i18n/constants";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

function toIdentifier(raw) {
  const cleaned = String(raw || "")
    .trim()
    .toLowerCase();
  return cleaned || "";
}

export async function fetchPreferredLanguage(identifier) {
  const safeIdentifier = toIdentifier(identifier);
  if (!safeIdentifier) {
    return null;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/preferences/language?identifier=${encodeURIComponent(safeIdentifier)}`,
    );

    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    return normalizeLanguage(payload?.preferredLanguage) || null;
  } catch {
    return null;
  }
}

export async function savePreferredLanguage(identifier, preferredLanguage) {
  const safeIdentifier = toIdentifier(identifier);
  const safeLanguage = normalizeLanguage(preferredLanguage) || DEFAULT_LANGUAGE;

  if (!safeIdentifier) {
    return false;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/preferences/language`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        identifier: safeIdentifier,
        preferredLanguage: safeLanguage,
      }),
    });

    return response.ok;
  } catch {
    return false;
  }
}
