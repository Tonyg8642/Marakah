import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  normalizeLanguageTag,
  resolveInterfaceLanguageTag,
  isRtlLanguage,
} from "./constants";

const resources = {
  en: { translation: en },
};

const loadedLocales = new Set(["en"]);
const localeLoaders = {
  ar: () => import("./locales/ar.json"),
  fa: () => import("./locales/fa.json"),
  ur: () => import("./locales/ur.json"),
  so: () => import("./locales/so.json"),
  es: () => import("./locales/es.json"),
};

export async function loadLocaleResources(languageTag) {
  const interfaceTag = resolveInterfaceLanguageTag(languageTag);
  if (loadedLocales.has(interfaceTag)) {
    return interfaceTag;
  }

  const loadLocale = localeLoaders[interfaceTag];
  if (!loadLocale) {
    return DEFAULT_LANGUAGE;
  }

  const module = await loadLocale();
  const payload = module?.default || module;
  if (payload && !i18n.hasResourceBundle(interfaceTag, "translation")) {
    i18n.addResourceBundle(interfaceTag, "translation", payload, true, true);
  }
  loadedLocales.add(interfaceTag);

  return interfaceTag;
}

export function detectInitialLanguage() {
  if (typeof window === "undefined") {
    return DEFAULT_LANGUAGE;
  }

  const saved = normalizeLanguageTag(
    window.localStorage.getItem(LANGUAGE_STORAGE_KEY),
  );
  if (saved) {
    return resolveInterfaceLanguageTag(saved);
  }

  const browserLanguage =
    normalizeLanguageTag(window.navigator.language) ||
    normalizeLanguageTag(window.navigator.languages?.[0]);

  return resolveInterfaceLanguageTag(browserLanguage || DEFAULT_LANGUAGE);
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
    lng: DEFAULT_LANGUAGE,
    fallbackLng: DEFAULT_LANGUAGE,
    interpolation: {
      escapeValue: false,
    },
    returnNull: false,
  });
}

const initialLanguage = detectInitialLanguage();
loadLocaleResources(initialLanguage)
  .then((tag) => i18n.changeLanguage(tag))
  .catch(() => i18n.changeLanguage(DEFAULT_LANGUAGE));

applyDocumentLanguage(i18n.language || DEFAULT_LANGUAGE);

i18n.on("languageChanged", (language) => {
  applyDocumentLanguage(language);
});

if (import.meta.env.DEV) {
  i18n.on("missingKey", (lngs, namespace, key) => {
    console.warn("[i18n missing key]", { lngs, namespace, key });
  });
}

export default i18n;
