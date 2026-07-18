import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLanguagePreference } from "../../contexts/LanguageContext";
import { saveSession } from "../../auth/session";
import CombinedIdentityBadge from "../../components/Identity/CombinedIdentityBadge";
import {
  IDENTITY_CONFIG,
  IDENTITY_CONFIG_BY_ID,
  OTHER_IDENTITY_ID,
  PREFER_NOT_TO_SAY_ID,
} from "../../identity/identityConfig";
import {
  clearOnboardingIdentitySelection,
  readOnboardingIdentitySelection,
  saveOnboardingIdentitySelection,
  sanitizeIdentitySelection,
} from "../../identity/identitySelectionStorage";
import { saveIdentityPreference } from "../../services/identityPreferenceApi";
import {
  COLLECTIONS,
  createProfileUserKey,
  writeStoredObject,
} from "../Profile/profileStorage";
import {
  getLanguageSupportSummary,
  rankLanguageCatalog,
} from "../../utils/languageCatalogSearch";
import "./Signup.css";

export default function Signup() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { language, changeLanguage, isSaving, selectableLanguages } =
    useLanguagePreference();

  const initialIdentity = readOnboardingIdentitySelection();
  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [selectedIdentityIds, setSelectedIdentityIds] = useState(
    initialIdentity.ethnicityIds,
  );
  const [languageSearchQuery, setLanguageSearchQuery] = useState("");
  const [identitySearchQuery, setIdentitySearchQuery] = useState("");
  const [customEthnicities, setCustomEthnicities] = useState(
    initialIdentity.customEthnicities,
  );
  const [customIdentityInput, setCustomIdentityInput] = useState("");
  const [isIdentityListExpanded, setIsIdentityListExpanded] = useState(true);
  const [failedOptionImageIds, setFailedOptionImageIds] = useState(
    () => new Set(),
  );
  const identityListTriggerRef = useRef(null);
  const firstIdentityCheckboxRef = useRef(null);

  const languageOptions = useMemo(
    () =>
      Array.isArray(selectableLanguages) && selectableLanguages.length
        ? selectableLanguages
        : [
            {
              id: "english",
              tag: "en",
              name: "English",
              nativeName: "English",
            },
          ],
    [selectableLanguages],
  );

  const identityOptions = useMemo(
    () => [...IDENTITY_CONFIG].sort((a, b) => a.name.localeCompare(b.name)),
    [],
  );

  const filteredLanguageOptions = useMemo(
    () =>
      rankLanguageCatalog(
        languageOptions,
        languageSearchQuery,
        selectedLanguage,
      ),
    [languageOptions, languageSearchQuery, selectedLanguage],
  );

  const selectedLanguageEntry = useMemo(
    () =>
      languageOptions.find((option) => option.tag === selectedLanguage) ||
      filteredLanguageOptions[0] ||
      null,
    [filteredLanguageOptions, languageOptions, selectedLanguage],
  );

  const selectedOptions = useMemo(
    () =>
      selectedIdentityIds
        .map((id) => IDENTITY_CONFIG_BY_ID[id])
        .filter(Boolean)
        .map((entry) => ({
          id: entry.id,
          displayName: entry.name,
          assetPath: entry.flagUrl,
          visualType: entry.symbolType === "flag" ? "flag" : "badge",
          badgeText: entry.symbol,
          accessibilityLabel: `${entry.name} identity`,
        })),
    [selectedIdentityIds],
  );

  const filteredIdentityOptions = useMemo(() => {
    const searchText = identitySearchQuery.trim().toLowerCase();
    if (!searchText) {
      return identityOptions;
    }

    return identityOptions.filter((option) =>
      [
        option.name,
        option.region,
        option.country,
        option.communityName,
        option.countryCode,
        ...(option.alternateNames || []),
        ...(option.searchTerms || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(searchText),
    );
  }, [identityOptions, identitySearchQuery]);

  const requiresCustomIdentity =
    selectedIdentityIds.includes(OTHER_IDENTITY_ID) &&
    customEthnicities.length === 0;

  useEffect(() => {
    if (isIdentityListExpanded) {
      firstIdentityCheckboxRef.current?.focus();
    }
  }, [isIdentityListExpanded]);

  async function handleLanguageChange(event) {
    const nextLanguage = event.target.value;
    setSelectedLanguage(nextLanguage);
    await changeLanguage(nextLanguage);
  }

  function persistDraft(nextIds, nextCustom = customEthnicities) {
    const safe = sanitizeIdentitySelection({
      ethnicityIds: nextIds,
      customEthnicities: nextCustom,
    });
    saveOnboardingIdentitySelection(safe);
  }

  function toggleIdentity(nextIdentityId) {
    setSelectedIdentityIds((current) => {
      let nextIds = current;

      if (nextIdentityId === PREFER_NOT_TO_SAY_ID) {
        nextIds = current.includes(PREFER_NOT_TO_SAY_ID)
          ? []
          : [PREFER_NOT_TO_SAY_ID];
      } else if (current.includes(nextIdentityId)) {
        nextIds = current.filter((id) => id !== nextIdentityId);
      } else {
        nextIds = [
          ...current.filter((id) => id !== PREFER_NOT_TO_SAY_ID),
          nextIdentityId,
        ];
      }

      persistDraft(nextIds);
      return nextIds;
    });

    if (nextIdentityId === PREFER_NOT_TO_SAY_ID) {
      setCustomEthnicities([]);
    }
  }

  function moveSelectedIdentity(index, direction) {
    setSelectedIdentityIds((current) => {
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }

      const next = [...current];
      const [entry] = next.splice(index, 1);
      next.splice(targetIndex, 0, entry);
      persistDraft(next);
      return next;
    });
  }

  function removeSelectedIdentity(id) {
    setSelectedIdentityIds((current) => {
      const next = current.filter((item) => item !== id);
      persistDraft(next);
      return next;
    });
  }

  function handleAddCustomIdentity() {
    const cleaned = customIdentityInput.trim().replace(/\s+/g, " ");
    if (!cleaned) {
      return;
    }

    setCustomEthnicities((current) => {
      if (
        current.some((item) => item.toLowerCase() === cleaned.toLowerCase())
      ) {
        setCustomIdentityInput("");
        return current;
      }

      const next = [...current, cleaned];
      persistDraft(selectedIdentityIds, next);
      setCustomIdentityInput("");
      return next;
    });
  }

  function handleRemoveCustomIdentity(value) {
    setCustomEthnicities((current) => {
      const next = current.filter((item) => item !== value);
      persistDraft(selectedIdentityIds, next);
      return next;
    });
  }

  function handleIdentityOptionImageError(optionId) {
    setFailedOptionImageIds((current) => {
      if (current.has(optionId)) {
        return current;
      }
      const next = new Set(current);
      next.add(optionId);
      return next;
    });
  }

  function handleIdentityListToggle() {
    setIsIdentityListExpanded((current) => !current);
  }

  function closeIdentityList() {
    setIsIdentityListExpanded(false);
    identityListTriggerRef.current?.focus();
  }

  async function saveSignupIdentityPreference(displayName, email) {
    const profileUserKey = createProfileUserKey(displayName);
    const payload = sanitizeIdentitySelection({
      ethnicityIds: selectedIdentityIds,
      customEthnicities,
    });

    writeStoredObject(profileUserKey, COLLECTIONS.IDENTITY_PREFERENCE, payload);
    await saveIdentityPreference(email || displayName, payload);
    clearOnboardingIdentitySelection();
  }

  async function handleSignupSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim() || "Guest";
    const email = String(form.get("email") || "").trim();

    await saveSignupIdentityPreference(name, email);
    saveSession(name, email);
    await changeLanguage(selectedLanguage);
    navigate("/");
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-symbols" aria-label="Islamic symbols">
          <div className="auth-symbol">
            <span className="auth-symbol__arabic" lang="ar">
              الله
            </span>
            <span className="auth-symbol__label">Allah</span>
          </div>
          <div className="auth-symbol">
            <span className="auth-symbol__arabic" lang="ar">
              محمد
            </span>
            <span className="auth-symbol__label">Muhammad</span>
          </div>
        </div>

        <h1>{t("auth.createAccount")}</h1>
        <p>{t("auth.joinCommunity")}</p>

        <form className="auth-form" onSubmit={handleSignupSubmit}>
          <label htmlFor="signup-name">{t("auth.fullName")}</label>
          <input
            id="signup-name"
            name="name"
            type="text"
            placeholder={t("auth.placeholders.name")}
            required
          />

          <label htmlFor="signup-email">{t("auth.email")}</label>
          <input
            id="signup-email"
            name="email"
            type="email"
            placeholder={t("auth.placeholders.email")}
            required
          />

          <label htmlFor="signup-password">{t("auth.password")}</label>
          <input
            id="signup-password"
            type="password"
            placeholder={t("auth.placeholders.password")}
          />

          <label htmlFor="signup-language">
            {t("language.onboardingQuestion", {
              defaultValue: "What's your preferred language or dialect?",
            })}
          </label>

          <label htmlFor="signup-language-search">
            {t("language.searchLabel", {
              defaultValue: "Search languages and dialects",
            })}
          </label>
          <div className="language-search-wrap">
            <span className="language-search-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                <circle
                  cx="11"
                  cy="11"
                  r="7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <line
                  x1="16.65"
                  y1="16.65"
                  x2="21"
                  y2="21"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <input
              id="signup-language-search"
              type="search"
              value={languageSearchQuery}
              onChange={(event) => setLanguageSearchQuery(event.target.value)}
              placeholder={t("language.searchPlaceholder", {
                defaultValue: "Search languages and dialects",
              })}
              autoComplete="off"
            />
          </div>

          <p className="language-search-count" aria-live="polite">
            {t("language.searchCount", {
              defaultValue: "{{count}} results",
              count: filteredLanguageOptions.length,
            })}
          </p>

          <select
            id="signup-language"
            value={selectedLanguage}
            onChange={handleLanguageChange}
            disabled={isSaving}
          >
            {filteredLanguageOptions.map((option) => (
              <option key={option.tag} value={option.tag}>
                {[
                  option.name,
                  option.nativeName,
                  getLanguageSupportSummary(option),
                ]
                  .filter(Boolean)
                  .join(" - ")}
              </option>
            ))}
          </select>
          {selectedLanguageEntry ? (
            <p className="language-search-meta" aria-live="polite">
              {getLanguageSupportSummary(selectedLanguageEntry)}
            </p>
          ) : null}

          <fieldset className="signup-ethnicity-fieldset">
            <legend>
              {t("auth.ethnicityLegend", {
                defaultValue: "Identity (optional)",
              })}
            </legend>
            <p className="signup-identity-note">
              {t("auth.ethnicityOptional", {
                defaultValue:
                  "Optional: select one or more identities. You can edit this later.",
              })}
            </p>

            <CombinedIdentityBadge
              selectedOptions={selectedOptions}
              ariaLabel={t("auth.identityBadgeAria", {
                defaultValue: "Combined selected identities",
              })}
            />

            <label htmlFor="signup-identity-search">
              {t("auth.ethnicitySearchLabel", {
                defaultValue: "Search identities",
              })}
            </label>

            <input
              id="signup-identity-search"
              type="search"
              value={identitySearchQuery}
              onChange={(event) => setIdentitySearchQuery(event.target.value)}
              placeholder={t("auth.ethnicitySearchPlaceholder", {
                defaultValue: "Search identities",
              })}
            />

            <button
              ref={identityListTriggerRef}
              type="button"
              className="btn-secondary"
              onClick={handleIdentityListToggle}
              aria-expanded={isIdentityListExpanded}
              aria-controls="signup-identity-options"
            >
              {isIdentityListExpanded
                ? t("auth.hideIdentityList", {
                    defaultValue: "Hide identity list",
                  })
                : t("auth.showIdentityList", {
                    defaultValue: "Show identity list",
                  })}
            </button>

            <div
              id="signup-identity-options"
              className="signup-ethnicity-grid"
              hidden={!isIdentityListExpanded}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  closeIdentityList();
                }
              }}
              aria-label={t("auth.identityListAria", {
                defaultValue: "Identity options",
              })}
            >
              {filteredIdentityOptions.map((option) => {
                const isChecked = selectedIdentityIds.includes(option.id);
                const imageFailed = failedOptionImageIds.has(option.id);
                return (
                  <label key={option.id} className="signup-ethnicity-option">
                    <input
                      ref={
                        firstIdentityCheckboxRef.current
                          ? undefined
                          : firstIdentityCheckboxRef
                      }
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleIdentity(option.id)}
                      aria-checked={isChecked}
                    />
                    {option.symbolType === "flag" &&
                    option.flagUrl &&
                    !imageFailed ? (
                      <img
                        className="signup-ethnicity-flag"
                        src={option.flagUrl}
                        alt={`${option.name} flag`}
                        loading="lazy"
                        decoding="async"
                        onError={() =>
                          handleIdentityOptionImageError(option.id)
                        }
                      />
                    ) : (
                      <span
                        className="signup-ethnicity-badge"
                        aria-hidden="true"
                      >
                        {option.symbol || "ID"}
                      </span>
                    )}
                    <span>{option.name}</span>
                  </label>
                );
              })}
            </div>

            {selectedOptions.length > 0 ? (
              <div
                className="signup-selected-list"
                aria-label="Selected identities"
              >
                {selectedOptions.map((option, index) => (
                  <div key={option.id} className="signup-selected-row">
                    <span>{option.displayName}</span>
                    <div className="signup-selected-actions">
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => moveSelectedIdentity(index, "up")}
                        disabled={index === 0}
                      >
                        {t("auth.moveUp", { defaultValue: "Up" })}
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => moveSelectedIdentity(index, "down")}
                        disabled={index === selectedOptions.length - 1}
                      >
                        {t("auth.moveDown", { defaultValue: "Down" })}
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => removeSelectedIdentity(option.id)}
                      >
                        {t("auth.removeIdentity", { defaultValue: "Remove" })}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            <p
              className="signup-identity-note"
              role="status"
              aria-live="polite"
            >
              {t("auth.identitySelectionCount", {
                defaultValue: "{{count}} identities selected",
                count: selectedIdentityIds.length,
              })}
            </p>

            {selectedIdentityIds.includes(OTHER_IDENTITY_ID) ? (
              <div className="signup-custom-row">
                <label htmlFor="signup-custom-identity-input">
                  {t("auth.otherIdentityLabel", {
                    defaultValue: "Add your tribe, nation, or community",
                  })}
                </label>
                <input
                  id="signup-custom-identity-input"
                  type="text"
                  value={customIdentityInput}
                  onChange={(event) =>
                    setCustomIdentityInput(event.target.value)
                  }
                  placeholder={t("auth.otherIdentityPlaceholder", {
                    defaultValue: "Add custom identity",
                  })}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleAddCustomIdentity}
                >
                  {t("auth.addIdentity", { defaultValue: "Add" })}
                </button>

                {customEthnicities.length > 0 ? (
                  <div className="signup-custom-list">
                    {customEthnicities.map((item) => (
                      <div key={item} className="signup-custom-item">
                        <span>{item}</span>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => handleRemoveCustomIdentity(item)}
                        >
                          {t("auth.removeIdentity", { defaultValue: "Remove" })}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </fieldset>

          <p id="signup-submit-help" className="signup-identity-note">
            {requiresCustomIdentity
              ? t("auth.customIdentityRequired", {
                  defaultValue:
                    "Add at least one custom identity when Other identity is selected.",
                })
              : t("auth.identityNotExhaustive", {
                  defaultValue:
                    "Comprehensive and extensible worldwide identity catalog with custom identity support. Use Other identity to add your tribe, nation, or community.",
                })}
          </p>

          <button
            type="submit"
            className="btn-primary"
            disabled={requiresCustomIdentity}
            aria-describedby="signup-submit-help"
            aria-disabled={requiresCustomIdentity}
          >
            {t("auth.signup")}
          </button>
        </form>
      </section>
    </main>
  );
}
