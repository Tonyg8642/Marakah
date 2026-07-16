export const SIGNED_IN_KEY = "marakah_is_signed_in";
export const NAME_KEY = "marakah_user_name";
export const EMAIL_KEY = "marakah_user_email";

export function isSignedIn() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(SIGNED_IN_KEY) === "true";
}

export function saveSession(name, email = "") {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(SIGNED_IN_KEY, "true");
  window.localStorage.setItem(NAME_KEY, name || "Guest");

  if (email) {
    window.localStorage.setItem(EMAIL_KEY, email);
  }
}

export function clearSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(SIGNED_IN_KEY);
  window.localStorage.removeItem(NAME_KEY);
  window.localStorage.removeItem(EMAIL_KEY);
}
