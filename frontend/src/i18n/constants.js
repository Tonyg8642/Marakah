export const INTERFACE_LANGUAGE_TAGS = ["en", "ar", "fa", "ur", "so", "es"];
export const RTL_BASE_LANGUAGES = new Set(["ar", "fa", "ur", "ps", "ku"]);
export const DEFAULT_LANGUAGE = "en";
export const LANGUAGE_STORAGE_KEY = "marakah_preferred_language";
export const USER_EMAIL_KEY = "marakah_user_email";
export const USER_NAME_KEY = "marakah_user_name";
export const SIGNED_IN_KEY = "marakah_is_signed_in";

export function normalizeLanguageTag(input) {
  const raw = String(input || "")
    .trim()
    .toLowerCase();
  if (!raw) {
    return null;
  }

  const normalized = raw.replace(/_/g, "-");
  const parts = normalized.split("-").filter(Boolean);
  if (!parts.length) {
    return null;
  }

  if (parts.length === 1) {
    return parts[0];
  }

  const [base, ...rest] = parts;
  const normalizedRest = rest.map((part) =>
    part.length === 2 ? part.toUpperCase() : part,
  );

  return [base, ...normalizedRest].join("-");
}

export function resolveInterfaceLanguageTag(input) {
  const normalized = normalizeLanguageTag(input);
  if (!normalized) {
    return DEFAULT_LANGUAGE;
  }

  if (INTERFACE_LANGUAGE_TAGS.includes(normalized)) {
    return normalized;
  }

  const base = normalized.split("-")[0];
  if (INTERFACE_LANGUAGE_TAGS.includes(base)) {
    return base;
  }

  return DEFAULT_LANGUAGE;
}

export function isRtlLanguage(languageTag) {
  const normalized = normalizeLanguageTag(languageTag) || "";
  const base = normalized.split("-")[0];
  return RTL_BASE_LANGUAGES.has(base);
}
