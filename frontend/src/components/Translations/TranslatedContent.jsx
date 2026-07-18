import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { usePageTranslation } from "../../contexts/PageTranslationContext";
import { useLanguagePreference } from "../../contexts/LanguageContext";
import "./TranslatedContent.css";

export default function TranslatedContent({
  as = "p",
  className = "",
  originalText,
  originalLanguage,
  identifier,
}) {
  const { t } = useTranslation();
  const { language, selectableLanguages, preferredLanguageTag } =
    useLanguagePreference();
  const {
    activeTargetTag,
    activeTargetName,
    translationEnabled,
    transliterationEnabled,
    openDialog,
    translateBlock,
  } = usePageTranslation();

  const [translatedText, setTranslatedText] = useState("");
  const [transliterationText, setTransliterationText] = useState("");
  const [fallbackNotice, setFallbackNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const sourceLanguage = String(originalLanguage || language || "en").trim();
  const safeOriginalText = String(originalText || "").trim();
  const Tag = as;

  const sourceLanguageName = useMemo(() => {
    const match = (
      Array.isArray(selectableLanguages) ? selectableLanguages : []
    ).find((entry) => entry?.tag === sourceLanguage);
    return match?.name || sourceLanguage;
  }, [selectableLanguages, sourceLanguage]);

  const targetLanguageName = useMemo(() => {
    const match = (
      Array.isArray(selectableLanguages) ? selectableLanguages : []
    ).find(
      (entry) =>
        entry?.tag === activeTargetTag || entry?.tag === preferredLanguageTag,
    );
    return (
      activeTargetName || match?.name || activeTargetTag || preferredLanguageTag
    );
  }, [
    activeTargetName,
    activeTargetTag,
    preferredLanguageTag,
    selectableLanguages,
  ]);

  const resolvedTargetTag = useMemo(
    () => String(activeTargetTag || preferredLanguageTag || "").trim(),
    [activeTargetTag, preferredLanguageTag],
  );

  const targetDirection = useMemo(() => {
    const match = (
      Array.isArray(selectableLanguages) ? selectableLanguages : []
    ).find((entry) => entry?.tag === resolvedTargetTag);
    return match?.direction === "rtl" ? "rtl" : "ltr";
  }, [resolvedTargetTag, selectableLanguages]);

  useEffect(() => {
    let cancelled = false;

    async function runTranslation() {
      if (!translationEnabled || !resolvedTargetTag || !safeOriginalText) {
        setTranslatedText("");
        setTransliterationText("");
        setFallbackNotice("");
        setErrorMessage("");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage("");
        const payload = await translateBlock({
          text: safeOriginalText,
          sourceLanguage,
          targetTag: resolvedTargetTag,
          identifier,
          includeTransliteration: transliterationEnabled,
        });

        if (cancelled) {
          return;
        }

        setTranslatedText(String(payload?.translatedText || "").trim());
        setTransliterationText(
          String(payload?.transliterationText || "").trim(),
        );
        setFallbackNotice(String(payload?.fallbackNotice || "").trim());
      } catch (error) {
        if (cancelled) {
          return;
        }

        setTranslatedText("");
        setTransliterationText("");
        setFallbackNotice("");
        setErrorMessage(
          error?.message ||
            t("translation.errorMessage", {
              defaultValue: "Could not translate this content right now.",
            }),
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    runTranslation();

    return () => {
      cancelled = true;
    };
  }, [
    identifier,
    resolvedTargetTag,
    safeOriginalText,
    translationEnabled,
    transliterationEnabled,
    sourceLanguage,
    t,
    translateBlock,
  ]);

  const hasTranslatedText = useMemo(
    () => Boolean(translationEnabled && translatedText),
    [translationEnabled, translatedText],
  );

  const hasTransliterationText = useMemo(
    () =>
      Boolean(
        translationEnabled &&
        transliterationEnabled &&
        transliterationText &&
        transliterationText !== translatedText,
      ),
    [
      translationEnabled,
      transliterationEnabled,
      transliterationText,
      translatedText,
    ],
  );

  return (
    <div className={`translated-content ${className}`.trim()}>
      {hasTranslatedText ? (
        <div className="translated-content__translation" aria-live="polite">
          <p
            className="translated-content__label"
            lang={resolvedTargetTag || undefined}
          >
            {t("translation.translatedInto", {
              defaultValue: "Translated into {{language}}",
              language: targetLanguageName,
            })}
          </p>

          {isLoading ? (
            <p className="translated-content__status" role="status">
              {t("translation.loading", {
                defaultValue: "Translating...",
              })}
            </p>
          ) : null}

          {!isLoading && errorMessage ? (
            <p className="translated-content__error" role="alert">
              {errorMessage}
            </p>
          ) : null}

          {fallbackNotice ? (
            <p className="translated-content__notice" role="status">
              {fallbackNotice}
            </p>
          ) : null}

          {hasTranslatedText ? (
            <Tag
              className="translated-content__text translated-content__native"
              lang={resolvedTargetTag}
              dir={targetDirection}
            >
              {translatedText}
            </Tag>
          ) : null}

          {hasTransliterationText ? (
            <p
              className="translated-content__transliteration"
              lang="en"
              dir="ltr"
            >
              {transliterationText}
            </p>
          ) : null}

          {!hasTransliterationText && transliterationEnabled && !isLoading ? (
            <p className="translated-content__notice" role="status">
              {t("translation.transliterationUnavailable", {
                defaultValue:
                  "Transliteration is not available for this language right now.",
              })}
            </p>
          ) : null}

          <p className="translated-content__label" lang={sourceLanguage}>
            {t("translation.originalLabel", {
              defaultValue: "Original ({{language}})",
              language: sourceLanguageName,
            })}
          </p>
          <p className="translated-content__original" lang={sourceLanguage}>
            {safeOriginalText}
          </p>
        </div>
      ) : (
        <>
          <p className="translated-content__label" lang={sourceLanguage}>
            {t("translation.originalLabel", {
              defaultValue: "Original ({{language}})",
              language: sourceLanguageName,
            })}
          </p>
          <Tag className="translated-content__original" lang={sourceLanguage}>
            {safeOriginalText}
          </Tag>
          {!resolvedTargetTag ? (
            <div className="translated-content__actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={openDialog}
              >
                {t("translation.chooseLanguage", {
                  defaultValue: "Choose language",
                })}
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
