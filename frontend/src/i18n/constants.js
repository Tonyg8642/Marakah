export const SUPPORTED_LANGUAGES = ["en", "ar", "fa", "ur", "so", "es"];
export const RTL_LANGUAGES = new Set(["ar", "fa", "ur"]);
export const DEFAULT_LANGUAGE = "en";
export const LANGUAGE_STORAGE_KEY = "marakah_preferred_language";
export const USER_EMAIL_KEY = "marakah_user_email";
export const USER_NAME_KEY = "marakah_user_name";
export const SIGNED_IN_KEY = "marakah_is_signed_in";

export function normalizeLanguage(input) {
  const raw = String(input || "")
    .trim()
    .toLowerCase();
  if (!raw) {
    return null;
  }

  if (SUPPORTED_LANGUAGES.includes(raw)) {
    return raw;
  }

  const base = raw.split("-")[0];
  if (SUPPORTED_LANGUAGES.includes(base)) {
    return base;
  }

  return null;
}

export function isRtlLanguage(language) {
  return RTL_LANGUAGES.has(language);
}
