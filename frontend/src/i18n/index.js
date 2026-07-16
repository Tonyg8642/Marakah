import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import ar from "./locales/ar.json";
import fa from "./locales/fa.json";
import ur from "./locales/ur.json";
import so from "./locales/so.json";
import es from "./locales/es.json";
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  normalizeLanguage,
  isRtlLanguage,
} from "./constants";

const resources = {
  en: { translation: en },
  ar: { translation: ar },
  fa: { translation: fa },
  ur: { translation: ur },
  so: { translation: so },
  es: { translation: es },
};

export function detectInitialLanguage() {
  if (typeof window === "undefined") {
    return DEFAULT_LANGUAGE;
  }

  const saved = normalizeLanguage(
    window.localStorage.getItem(LANGUAGE_STORAGE_KEY),
  );
  if (saved) {
    return saved;
  }

  const browserLanguage =
    normalizeLanguage(window.navigator.language) ||
    normalizeLanguage(window.navigator.languages?.[0]);

  return browserLanguage || DEFAULT_LANGUAGE;
}

export function applyDocumentLanguage(language) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.lang = language;
  document.documentElement.dir = isRtlLanguage(language) ? "rtl" : "ltr";
}

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: detectInitialLanguage(),
    fallbackLng: DEFAULT_LANGUAGE,
    interpolation: {
      escapeValue: false,
    },
    returnNull: false,
  });
}

applyDocumentLanguage(i18n.language);

i18n.on("languageChanged", (language) => {
  applyDocumentLanguage(language);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }
});

export default i18n;
