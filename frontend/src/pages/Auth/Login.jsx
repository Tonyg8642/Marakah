import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLanguagePreference } from "../../contexts/LanguageContext";
import { fetchPreferredLanguage } from "../../services/languagePreferenceApi";
import { NAME_KEY, saveSession } from "../../auth/session";
import {
  getLanguageSupportSummary,
  rankLanguageCatalog,
} from "../../utils/languageCatalogSearch";

const CREDENTIAL_KEY = "marakah_webauthn_credential_id";
const MOBILE_VIEW_QUERY = "(max-width: 900px)";

function toBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(value) {
  const padded = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes.buffer;
}

export default function Login() {
  const { t } = useTranslation();
  const { language, changeLanguage, isSaving, selectableLanguages } =
    useLanguagePreference();
  const navigate = useNavigate();
  const [authMessage, setAuthMessage] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [languageSearchQuery, setLanguageSearchQuery] = useState("");
  const [isMobileClient, setIsMobileClient] = useState(() => {
    const mobileUA =
      /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      );

    return mobileUA || window.matchMedia(MOBILE_VIEW_QUERY).matches;
  });

  useEffect(() => {
    setSelectedLanguage(language);
  }, [language]);

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_VIEW_QUERY);
    const handleQueryChange = (event) => {
      setIsMobileClient(event.matches);
    };

    mediaQuery.addEventListener("change", handleQueryChange);

    return () => {
      mediaQuery.removeEventListener("change", handleQueryChange);
    };
  }, []);

  const languageOptions = useMemo(
    () =>
      Array.isArray(selectableLanguages) && selectableLanguages.length
        ? selectableLanguages
        : [
            {
              id: "english",
              name: "English",
              nativeName: "English",
              tag: "en",
              region: "Global",
              classification: "language",
              direction: "ltr",
              interfaceStatus: "full",
              translationStatus: "provider-supported",
              exactDialectSupported: true,
            },
          ],
    [selectableLanguages],
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
      languageOptions.find((entry) => entry.tag === selectedLanguage) ||
      filteredLanguageOptions[0] ||
      null,
    [filteredLanguageOptions, languageOptions, selectedLanguage],
  );

  async function handleBiometricSignIn() {
    if (!window.PublicKeyCredential || !navigator.credentials) {
      setAuthMessage(t("auth.biometricUnsupported"));
      return;
    }

    const isPlatformAuthAvailable =
      await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();

    if (!isPlatformAuthAvailable) {
      setAuthMessage(t("auth.noAuthenticator"));
      return;
    }

    try {
      setIsAuthenticating(true);
      setAuthMessage("");

      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const existingCredentialId = localStorage.getItem(CREDENTIAL_KEY);

      if (existingCredentialId) {
        await navigator.credentials.get({
          publicKey: {
            challenge,
            userVerification: "required",
            allowCredentials: [
              {
                type: "public-key",
                id: fromBase64Url(existingCredentialId),
              },
            ],
          },
        });
      } else {
        const userId = crypto.getRandomValues(new Uint8Array(16));
        const credential = await navigator.credentials.create({
          publicKey: {
            challenge,
            rp: {
              name: "Marakah",
            },
            user: {
              id: userId,
              name: "marakah-user",
              displayName: "Marakah User",
            },
            pubKeyCredParams: [{ type: "public-key", alg: -7 }],
            authenticatorSelection: {
              authenticatorAttachment: "platform",
              userVerification: "required",
            },
            timeout: 60000,
          },
        });

        const credentialId = credential?.rawId
          ? toBase64Url(credential.rawId)
          : "";
        if (credentialId) {
          localStorage.setItem(CREDENTIAL_KEY, credentialId);
        }
      }

      const existingName = localStorage.getItem(NAME_KEY) || "Tony Glass";
      saveSession(existingName);
      await changeLanguage(selectedLanguage);
      setAuthMessage(t("auth.biometricSuccess"));
      navigate("/");
    } catch {
      setAuthMessage(t("auth.biometricFailed"));
    } finally {
      setIsAuthenticating(false);
    }
  }

  async function handlePasswordSignIn(event) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const nameInput = String(form.get("name") || "").trim();
    const normalizedName = nameInput
      ? nameInput
          .split(/[._-]/)
          .filter(Boolean)
          .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
          .join(" ")
      : "Guest";

    saveSession(normalizedName);
    const remoteLanguage = await fetchPreferredLanguage(normalizedName);
    await changeLanguage(remoteLanguage || selectedLanguage);
    navigate("/");
  }

  async function handleLanguageChange(event) {
    const nextLanguage = event.target.value;
    setSelectedLanguage(nextLanguage);
    await changeLanguage(nextLanguage);
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-symbols" aria-label={t("auth.symbolsAria")}>
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

        <h1>{t("auth.welcomeBack")}</h1>
        <p>{isMobileClient ? t("auth.mobileFlow") : t("auth.desktopFlow")}</p>

        <form className="auth-form" onSubmit={handlePasswordSignIn}>
          <label htmlFor="login-language">
            {t("language.onboardingQuestion", {
              defaultValue: "What's your preferred language or dialect?",
            })}
          </label>
          <label htmlFor="login-language-search">
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
              id="login-language-search"
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
            id="login-language"
            value={selectedLanguage}
            onChange={handleLanguageChange}
            disabled={isSaving || isAuthenticating}
          >
            {filteredLanguageOptions.map((option) => (
              <option key={option.id || option.tag} value={option.tag}>
                {option.nativeName && option.nativeName !== option.name
                  ? `${option.name} (${option.nativeName})`
                  : option.name}
              </option>
            ))}
          </select>
          {selectedLanguageEntry ? (
            <p className="language-search-meta" aria-live="polite">
              {getLanguageSupportSummary(selectedLanguageEntry)}
            </p>
          ) : null}

          <label htmlFor="login-name">{t("auth.username")}</label>
          <input
            id="login-name"
            name="name"
            type="text"
            autoComplete="username"
            placeholder={t("auth.placeholders.username")}
            required
          />

          <label htmlFor="login-password">{t("auth.password")}</label>
          <input
            id="login-password"
            type="password"
            placeholder="••••••••"
            required
          />

          <button type="submit" className="btn-primary">
            {t("auth.login")}
          </button>
        </form>

        <div className="auth-biometric">
          <button
            type="button"
            className="btn-secondary"
            onClick={handleBiometricSignIn}
            disabled={isAuthenticating}
          >
            {isAuthenticating
              ? t("auth.authenticating")
              : t("auth.useBiometric")}
          </button>
          {authMessage && <p className="auth-note">{authMessage}</p>}
        </div>
      </section>
    </main>
  );
}
