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
  normalizeLanguageTag,
} from "../i18n/constants";
import { resolveInterfaceLanguage } from "../i18n/interfaceLanguageResolver";
import { loadLocaleResources } from "../i18n";
import {
  fetchPreferredLanguage,
  savePreferredLanguage,
} from "../services/languagePreferenceApi";
import {
  fetchLanguageCatalog,
  getFallbackLanguageCatalog,
} from "../services/languageCatalogApi";

const LanguageContext = createContext({
  language: DEFAULT_LANGUAGE,
  preferredLanguageTag: DEFAULT_LANGUAGE,
  resolvedInterfaceTag: DEFAULT_LANGUAGE,
  interfaceResolution: {
    requestedTag: DEFAULT_LANGUAGE,
    interfaceTag: DEFAULT_LANGUAGE,
    direction: "ltr",
    exactInterfaceSupported: true,
    fallbackChain: [DEFAULT_LANGUAGE],
  },
  changeLanguage: async () => false,
  isSaving: false,
  languageCatalog: [],
  selectableLanguages: [],
  isCatalogLoading: true,
  isLanguageReady: true,
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
  const [languageCatalog, setLanguageCatalog] = useState(() =>
    getFallbackLanguageCatalog(),
  );
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);
  const [language, setLanguage] = useState(
    () =>
      normalizeLanguageTag(
        typeof window !== "undefined"
          ? window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
          : i18n.language,
      ) || DEFAULT_LANGUAGE,
  );
  const [resolvedInterfaceTag, setResolvedInterfaceTag] = useState(
    () => normalizeLanguageTag(i18n.language) || DEFAULT_LANGUAGE,
  );
  const [interfaceResolution, setInterfaceResolution] = useState(() =>
    resolveInterfaceLanguage(language, getFallbackLanguageCatalog()),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isLanguageReady, setIsLanguageReady] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }

    return window.localStorage.getItem(SIGNED_IN_KEY) !== "true";
  });

  useEffect(() => {
    let cancelled = false;

    async function loadCatalog() {
      const nextCatalog = await fetchLanguageCatalog();
      if (cancelled) {
        return;
      }

      setLanguageCatalog(
        Array.isArray(nextCatalog) && nextCatalog.length
          ? nextCatalog
          : getFallbackLanguageCatalog(),
      );
      setIsCatalogLoading(false);
    }

    loadCatalog();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const resolution = resolveInterfaceLanguage(language, languageCatalog);
    setInterfaceResolution(resolution);
    setResolvedInterfaceTag(resolution.interfaceTag);
  }, [language, languageCatalog]);

  const applyPreferredLanguage = useCallback(
    async (nextLanguage, shouldPersistRemote = true) => {
      const safeLanguage =
        normalizeLanguageTag(nextLanguage) || DEFAULT_LANGUAGE;
      const resolution = resolveInterfaceLanguage(
        safeLanguage,
        languageCatalog,
      );
      setLanguage(safeLanguage);
      setInterfaceResolution(resolution);
      setResolvedInterfaceTag(resolution.interfaceTag);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LANGUAGE_STORAGE_KEY, safeLanguage);
      }

      await loadLocaleResources(resolution.interfaceTag);
      await i18n.changeLanguage(resolution.interfaceTag);
      if (shouldPersistRemote) {
        const identifier = getSignedInIdentifier();
        if (identifier) {
          const match = languageCatalog.find(
            (entry) => normalizeLanguageTag(entry?.tag) === safeLanguage,
          );
          await savePreferredLanguage(identifier, safeLanguage, match?.id);
        }
      }

      return true;
    },
    [languageCatalog],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadRemotePreference() {
      setIsLanguageReady(false);
      try {
        const identifier = getSignedInIdentifier();
        if (!identifier) {
          return;
        }

        const remoteLanguage = await fetchPreferredLanguage(identifier);
        if (!cancelled && remoteLanguage) {
          await applyPreferredLanguage(remoteLanguage, false);
        }
      } finally {
        if (!cancelled) {
          setIsLanguageReady(true);
        }
      }
    }

    loadRemotePreference();

    return () => {
      cancelled = true;
    };
  }, [applyPreferredLanguage]);

  const changeLanguage = useCallback(
    async (nextLanguage) => {
      setIsSaving(true);

      try {
        return await applyPreferredLanguage(nextLanguage, true);
      } finally {
        setIsSaving(false);
      }
    },
    [applyPreferredLanguage],
  );

  const selectableLanguages = useMemo(
    () =>
      languageCatalog
        .filter((entry) => entry?.active && entry?.selectable)
        .sort((a, b) =>
          String(a.name || "").localeCompare(String(b.name || "")),
        ),
    [languageCatalog],
  );

  const value = useMemo(
    () => ({
      language,
      preferredLanguageTag: language,
      resolvedInterfaceTag,
      interfaceResolution,
      changeLanguage,
      isSaving,
      languageCatalog,
      selectableLanguages,
      isCatalogLoading,
      isLanguageReady,
    }),
    [
      language,
      resolvedInterfaceTag,
      interfaceResolution,
      changeLanguage,
      isSaving,
      languageCatalog,
      selectableLanguages,
      isCatalogLoading,
      isLanguageReady,
    ],
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
