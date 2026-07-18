import {
  createContext,
  useCallback,
  useEffect,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLanguagePreference } from "./LanguageContext";
import { translateText } from "../services/translationApi";

const RECENT_TRANSLATION_TARGETS_KEY = "marakah_recent_translation_targets";
const TRANSLATION_SETTINGS_KEY = "marakah_translation_settings";

const PageTranslationContext = createContext({
  isDialogOpen: false,
  openDialog: () => {},
  closeDialog: () => {},
  activeTargetTag: "",
  activeTargetName: "",
  translationEnabled: false,
  transliterationEnabled: false,
  setTranslationEnabled: () => {},
  setTransliterationEnabled: () => {},
  setDisplayMode: () => {},
  applyTranslationTarget: () => {},
  clearTranslationTarget: () => {},
  recentTargetTags: [],
  translateBlock: async () => {
    throw new Error("Translation context is not ready.");
  },
});

function readRecentTargets() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(RECENT_TRANSLATION_TARGETS_KEY);
    const parsed = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .slice(0, 8);
  } catch {
    return [];
  }
}

function saveRecentTargets(targetTags) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    RECENT_TRANSLATION_TARGETS_KEY,
    JSON.stringify(targetTags.slice(0, 8)),
  );
}

function readTranslationSettings() {
  if (typeof window === "undefined") {
    return {
      translationEnabled: false,
      transliterationEnabled: false,
      targetTag: "",
      targetName: "",
    };
  }

  try {
    const raw = window.localStorage.getItem(TRANSLATION_SETTINGS_KEY);
    const parsed = JSON.parse(raw || "{}");
    return {
      translationEnabled: Boolean(parsed?.translationEnabled),
      transliterationEnabled: Boolean(parsed?.transliterationEnabled),
      targetTag: String(parsed?.targetTag || "").trim(),
      targetName: String(parsed?.targetName || "").trim(),
    };
  } catch {
    return {
      translationEnabled: false,
      transliterationEnabled: false,
      targetTag: "",
      targetName: "",
    };
  }
}

export function PageTranslationProvider({ children }) {
  const { preferredLanguageTag } = useLanguagePreference();
  const initialSettings = readTranslationSettings();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTargetTag, setActiveTargetTag] = useState(
    initialSettings.targetTag || preferredLanguageTag || "",
  );
  const [activeTargetName, setActiveTargetName] = useState(
    initialSettings.targetName,
  );
  const [translationEnabled, setTranslationEnabled] = useState(
    initialSettings.translationEnabled,
  );
  const [transliterationEnabled, setTransliterationEnabled] = useState(
    initialSettings.transliterationEnabled,
  );
  const [recentTargetTags, setRecentTargetTags] = useState(readRecentTargets);
  const cacheRef = useRef(new Map());

  useEffect(() => {
    if (!activeTargetTag && preferredLanguageTag) {
      setActiveTargetTag(preferredLanguageTag);
    }
  }, [activeTargetTag, preferredLanguageTag]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const safePreferred = String(preferredLanguageTag || "").trim();
    window.localStorage.setItem(
      TRANSLATION_SETTINGS_KEY,
      JSON.stringify({
        preferredLanguage: safePreferred,
        translationEnabled,
        transliterationEnabled,
        targetTag: activeTargetTag || safePreferred,
        targetName: activeTargetName,
      }),
    );
  }, [
    activeTargetName,
    activeTargetTag,
    preferredLanguageTag,
    translationEnabled,
    transliterationEnabled,
  ]);

  const openDialog = useCallback(() => {
    setIsDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setIsDialogOpen(false);
  }, []);

  const applyTranslationTarget = useCallback((targetTag, targetName = "") => {
    const safeTargetTag = String(targetTag || "").trim();
    if (!safeTargetTag) {
      return;
    }

    setActiveTargetTag(safeTargetTag);
    setActiveTargetName(String(targetName || "").trim());
    setTranslationEnabled(true);
    setRecentTargetTags((current) => {
      const next = [
        safeTargetTag,
        ...current.filter((tag) => tag !== safeTargetTag),
      ].slice(0, 8);
      saveRecentTargets(next);
      return next;
    });
  }, []);

  const clearTranslationTarget = useCallback(() => {
    setActiveTargetTag("");
    setActiveTargetName("");
    setTranslationEnabled(false);
    setTransliterationEnabled(false);
  }, []);

  const setDisplayMode = useCallback((mode) => {
    if (mode === "translate") {
      setTranslationEnabled(true);
      return;
    }

    setTranslationEnabled(false);
  }, []);

  const translateBlock = useCallback(
    async ({
      text,
      sourceLanguage,
      targetTag,
      identifier,
      includeTransliteration,
    }) => {
      const safeText = String(text || "").trim();
      const safeSourceLanguage = String(sourceLanguage || "").trim() || "auto";
      const safeTargetTag =
        String(targetTag || "").trim() ||
        activeTargetTag ||
        preferredLanguageTag;
      const safeIncludeTransliteration = Boolean(includeTransliteration);

      if (!safeText || !safeTargetTag) {
        return null;
      }

      const cacheKey = `${safeSourceLanguage}::${safeTargetTag}::${safeIncludeTransliteration ? "with-translit" : "native-only"}::${safeText}`;
      if (cacheRef.current.has(cacheKey)) {
        return cacheRef.current.get(cacheKey);
      }

      const payload = await translateText({
        text: safeText,
        sourceLanguage: safeSourceLanguage,
        requestedTargetTag: safeTargetTag,
        identifier,
        includeTransliteration: safeIncludeTransliteration,
      });

      cacheRef.current.set(cacheKey, payload);
      return payload;
    },
    [activeTargetTag, preferredLanguageTag],
  );

  const value = useMemo(
    () => ({
      isDialogOpen,
      openDialog,
      closeDialog,
      activeTargetTag,
      activeTargetName,
      translationEnabled,
      transliterationEnabled,
      setTranslationEnabled,
      setTransliterationEnabled,
      setDisplayMode,
      applyTranslationTarget,
      clearTranslationTarget,
      recentTargetTags,
      translateBlock,
    }),
    [
      isDialogOpen,
      openDialog,
      closeDialog,
      activeTargetTag,
      activeTargetName,
      translationEnabled,
      transliterationEnabled,
      setTranslationEnabled,
      setTransliterationEnabled,
      setDisplayMode,
      applyTranslationTarget,
      clearTranslationTarget,
      recentTargetTags,
      translateBlock,
    ],
  );

  return (
    <PageTranslationContext.Provider value={value}>
      {children}
    </PageTranslationContext.Provider>
  );
}

export function usePageTranslation() {
  return useContext(PageTranslationContext);
}
