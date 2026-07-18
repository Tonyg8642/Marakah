import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLanguagePreference } from "../../contexts/LanguageContext";
import { usePageTranslation } from "../../contexts/PageTranslationContext";
import { rankLanguageCatalog } from "../../utils/languageCatalogSearch";
import "./TranslationToolbar.css";

function isGeneralLanguageEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return false;
  }

  const id = String(entry.id || "").toLowerCase();
  const tag = String(entry.tag || "").toLowerCase();
  if (id.includes("quranic") || tag.includes("quranic")) {
    return false;
  }

  return Boolean(entry.active && entry.selectable);
}

export default function TranslationToolbar() {
  const { t } = useTranslation();
  const { language, preferredLanguageTag, selectableLanguages } =
    useLanguagePreference();
  const {
    isDialogOpen,
    openDialog,
    closeDialog,
    activeTargetTag,
    activeTargetName,
    translationEnabled,
    transliterationEnabled,
    setTransliterationEnabled,
    setDisplayMode,
    applyTranslationTarget,
    recentTargetTags,
  } = usePageTranslation();

  const [searchQuery, setSearchQuery] = useState("");
  const [pendingTargetTag, setPendingTargetTag] = useState(
    activeTargetTag || "",
  );
  const triggerButtonRef = useRef(null);
  const searchInputRef = useRef(null);

  const languageOptions = useMemo(
    () =>
      (Array.isArray(selectableLanguages) ? selectableLanguages : []).filter(
        isGeneralLanguageEntry,
      ),
    [selectableLanguages],
  );

  const recentLanguages = useMemo(
    () =>
      recentTargetTags
        .map((tag) => languageOptions.find((entry) => entry.tag === tag))
        .filter(Boolean),
    [languageOptions, recentTargetTags],
  );

  const rankedOptions = useMemo(
    () => rankLanguageCatalog(languageOptions, searchQuery, language),
    [language, languageOptions, searchQuery],
  );

  useEffect(() => {
    if (!isDialogOpen) {
      return;
    }

    const timer = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 20);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isDialogOpen]);

  useEffect(() => {
    if (isDialogOpen) {
      setPendingTargetTag(activeTargetTag || "");
      setSearchQuery("");
    }
  }, [activeTargetTag, isDialogOpen]);

  function handleCloseDialog() {
    closeDialog();
    triggerButtonRef.current?.focus();
  }

  function handleSubmit(event) {
    event.preventDefault();
    const match = languageOptions.find(
      (entry) => entry.tag === pendingTargetTag,
    );
    if (!match) {
      return;
    }

    applyTranslationTarget(match.tag, match.name);
    closeDialog();
    triggerButtonRef.current?.focus();
  }

  function handleSetOriginal() {
    setDisplayMode("original");
  }

  function handleSetTranslate() {
    if (!activeTargetTag && preferredLanguageTag) {
      const preferredEntry = languageOptions.find(
        (entry) => entry.tag === preferredLanguageTag,
      );
      applyTranslationTarget(preferredLanguageTag, preferredEntry?.name || "");
    }
    setDisplayMode("translate");
  }

  return (
    <>
      <div className="translation-toolbar">
        <button
          type="button"
          className={`header__link translation-toolbar__button ${
            !translationEnabled ? "is-active" : ""
          }`}
          onClick={handleSetOriginal}
        >
          {t("translation.originalControl", {
            defaultValue: "Original",
          })}
        </button>

        <button
          type="button"
          className={`header__link translation-toolbar__button ${
            translationEnabled ? "is-active" : ""
          }`}
          onClick={handleSetTranslate}
        >
          {t("translation.translateControl", {
            defaultValue: "Translate",
          })}
        </button>

        <label className="translation-toolbar__toggle">
          <input
            type="checkbox"
            checked={transliterationEnabled}
            onChange={(event) =>
              setTransliterationEnabled(event.target.checked)
            }
            disabled={!translationEnabled}
          />
          <span>
            {t("translation.showTransliteration", {
              defaultValue: "Show Transliteration",
            })}
          </span>
        </label>

        <button
          ref={triggerButtonRef}
          type="button"
          className="header__link translation-toolbar__toggle"
          onClick={openDialog}
          aria-label={t("translation.buttonAria", {
            defaultValue: "Choose translation language",
          })}
        >
          {t("translation.chooseLanguage", {
            defaultValue: "Language",
          })}
        </button>

        {translationEnabled && activeTargetTag ? (
          <span className="translation-toolbar__target" aria-live="polite">
            {t("translation.activeTargetShort", {
              defaultValue: "Target: {{language}}",
              language: activeTargetName || activeTargetTag,
            })}
          </span>
        ) : null}
      </div>

      {isDialogOpen ? (
        <div className="translation-modal-backdrop" role="presentation">
          <div
            className="translation-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="translation-dialog-title"
          >
            <h2 id="translation-dialog-title">
              {t("translation.dialogQuestion", {
                defaultValue:
                  "What language would you like this page translated into?",
              })}
            </h2>
            <p className="translation-modal__hint">
              {t("translation.dialogQuestionEnglish", {
                defaultValue:
                  "What language would you like this page translated into?",
              })}
            </p>

            <form className="translation-modal__form" onSubmit={handleSubmit}>
              <label htmlFor="translation-language-search">
                {t("language.searchLabel", {
                  defaultValue: "Search languages and dialects",
                })}
              </label>
              <input
                ref={searchInputRef}
                id="translation-language-search"
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t("language.searchPlaceholder", {
                  defaultValue: "Search languages and dialects",
                })}
                autoComplete="off"
              />

              {recentLanguages.length ? (
                <div className="translation-modal__recents">
                  <p>
                    {t("translation.recentLanguages", {
                      defaultValue: "Recent",
                    })}
                  </p>
                  <div className="translation-modal__chips">
                    {recentLanguages.map((entry) => (
                      <button
                        key={entry.tag}
                        type="button"
                        className="translation-chip"
                        onClick={() => setPendingTargetTag(entry.tag)}
                      >
                        {entry.name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <p className="translation-modal__count" aria-live="polite">
                {t("language.searchCount", {
                  defaultValue: "{{count}} results",
                  count: rankedOptions.length,
                })}
              </p>

              <div
                className="translation-modal__list"
                role="listbox"
                aria-label="Translation languages"
              >
                {rankedOptions.map((entry) => {
                  const isSelected = pendingTargetTag === entry.tag;
                  return (
                    <label key={entry.tag} className="translation-option">
                      <input
                        type="radio"
                        name="translation-target"
                        value={entry.tag}
                        checked={isSelected}
                        onChange={() => setPendingTargetTag(entry.tag)}
                      />
                      <span className="translation-option__label">
                        {entry.name}
                        {entry.nativeName && entry.nativeName !== entry.name
                          ? ` (${entry.nativeName})`
                          : ""}
                      </span>
                    </label>
                  );
                })}
              </div>

              <div className="translation-modal__actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleCloseDialog}
                >
                  {t("translation.cancel", { defaultValue: "Cancel" })}
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={!pendingTargetTag}
                >
                  {t("translation.applyLanguage", {
                    defaultValue: "Use language",
                  })}
                </button>
              </div>
            </form>

            {activeTargetTag ? (
              <p className="translation-modal__active" aria-live="polite">
                {t("translation.activeTarget", {
                  defaultValue: "Current translation target: {{language}}",
                  language: activeTargetName || activeTargetTag,
                })}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
