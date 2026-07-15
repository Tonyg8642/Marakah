import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import i18n from "../i18n";
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  SIGNED_IN_KEY,
  USER_EMAIL_KEY,
  USER_NAME_KEY,
  normalizeLanguage,
} from "../i18n/constants";
import {
  fetchPreferredLanguage,
  savePreferredLanguage,
} from "../services/languagePreferenceApi";

const LanguageContext = createContext({
  language: DEFAULT_LANGUAGE,
  changeLanguage: async () => false,
  isSaving: false,
});

function getSignedInIdentifier() {
  if (typeof window === "undefined") {
    return "";
  }

  const isSignedIn = window.localStorage.getItem(SIGNED_IN_KEY) === "true";
  if (!isSignedIn) {
    return "";
  }

  return (
    window.localStorage.getItem(USER_EMAIL_KEY) ||
    window.localStorage.getItem(USER_NAME_KEY) ||
    ""
  ).trim();
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(
    () => normalizeLanguage(i18n.language) || DEFAULT_LANGUAGE,
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const handleLanguageChanged = (nextLanguage) => {
      const safe = normalizeLanguage(nextLanguage) || DEFAULT_LANGUAGE;
      setLanguage(safe);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LANGUAGE_STORAGE_KEY, safe);
      }
    };

    i18n.on("languageChanged", handleLanguageChanged);
    return () => {
      i18n.off("languageChanged", handleLanguageChanged);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadRemotePreference() {
      const identifier = getSignedInIdentifier();
      if (!identifier) {
        return;
      }

      const remoteLanguage = await fetchPreferredLanguage(identifier);
      if (!cancelled && remoteLanguage && remoteLanguage !== i18n.language) {
        await i18n.changeLanguage(remoteLanguage);
      }
    }

    loadRemotePreference();

    return () => {
      cancelled = true;
    };
  }, []);

  const changeLanguage = useCallback(async (nextLanguage) => {
    const safeLanguage = normalizeLanguage(nextLanguage) || DEFAULT_LANGUAGE;
    setIsSaving(true);

    try {
      await i18n.changeLanguage(safeLanguage);
      const identifier = getSignedInIdentifier();
      if (identifier) {
        await savePreferredLanguage(identifier, safeLanguage);
      }
      return true;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const value = useMemo(
    () => ({ language, changeLanguage, isSaving }),
    [language, changeLanguage, isSaving],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguagePreference() {
  return useContext(LanguageContext);
}
