import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLanguagePreference } from "../../contexts/LanguageContext";
import { fetchPreferredLanguage } from "../../services/languagePreferenceApi";
import { NAME_KEY, saveSession } from "../../auth/session";

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
  const { changeLanguage } = useLanguagePreference();
  const navigate = useNavigate();
  const [authMessage, setAuthMessage] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isMobileClient, setIsMobileClient] = useState(() => {
    const mobileUA =
      /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      );

    return mobileUA || window.matchMedia(MOBILE_VIEW_QUERY).matches;
  });
  const [pingState, setPingState] = useState("idle");
  const [pingReference, setPingReference] = useState("");

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_VIEW_QUERY);
    const handleQueryChange = (event) => {
      setIsMobileClient(event.matches);
      setPingState("idle");
      setPingReference("");
    };

    mediaQuery.addEventListener("change", handleQueryChange);

    return () => {
      mediaQuery.removeEventListener("change", handleQueryChange);
    };
  }, []);

  async function handleSendMobilePing() {
    if (!isMobileClient) {
      setAuthMessage(t("auth.secureMobileOnly"));
      return;
    }

    try {
      setPingState("sending");
      setAuthMessage("");

      const newPingReference = `MRK-${Math.random()
        .toString(36)
        .slice(2, 8)
        .toUpperCase()}`;

      setPingReference(newPingReference);

      if ("Notification" in window) {
        let permission = Notification.permission;

        if (permission === "default") {
          permission = await Notification.requestPermission();
        }

        if (permission === "granted") {
          new Notification("Marakah Login Approval", {
            body: `Approve request ${newPingReference}, then use Face ID/Fingerprint.`,
            tag: "marakah-login-ping",
          });
        }
      }

      if (navigator.vibrate) {
        navigator.vibrate([120, 80, 120]);
      }

      setPingState("sent");
      setAuthMessage(t("auth.pingSent", { code: newPingReference }));
    } catch {
      setPingState("idle");
      setAuthMessage(t("auth.pingFailed"));
    }
  }

  function handleApproveMobilePing() {
    setPingState("approved");
    setAuthMessage(t("auth.pingApproved"));
  }

  async function handleBiometricSignIn() {
    if (isMobileClient && pingState !== "approved") {
      setAuthMessage(t("auth.approveFirst"));
      return;
    }

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
      const remoteLanguage = await fetchPreferredLanguage(existingName);
      if (remoteLanguage) {
        await changeLanguage(remoteLanguage);
      }
      setAuthMessage(t("auth.biometricSuccess"));
      setPingState("idle");
      setPingReference("");
      navigate("/");
    } catch {
      setAuthMessage(t("auth.biometricFailed"));
    } finally {
      setIsAuthenticating(false);
    }
  }

  async function handlePasswordSignIn(event) {
    event.preventDefault();

    if (isMobileClient) {
      setAuthMessage(t("auth.mobileInstruction"));
      return;
    }

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim();
    const nameFromEmail = (form.get("email") || "").toString().split("@")[0];
    const normalizedName = nameFromEmail
      ? nameFromEmail
          .split(/[._-]/)
          .filter(Boolean)
          .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
          .join(" ")
      : "Guest";

    saveSession(normalizedName, email);
    const remoteLanguage = await fetchPreferredLanguage(
      email || normalizedName,
    );
    if (remoteLanguage) {
      await changeLanguage(remoteLanguage);
    }
    navigate("/");
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
          <label htmlFor="login-email">{t("auth.email")}</label>
          <input
            id="login-email"
            name="email"
            type="email"
            placeholder={t("auth.placeholders.email")}
          />

          <label htmlFor="login-password">{t("auth.password")}</label>
          <input id="login-password" type="password" placeholder="••••••••" />

          <button type="submit" className="btn-primary">
            {t("auth.login")}
          </button>
        </form>

        {isMobileClient ? (
          <div className="auth-ping" aria-live="polite">
            <button
              type="button"
              className="btn-secondary"
              onClick={handleSendMobilePing}
              disabled={pingState === "sending"}
            >
              {pingState === "sending"
                ? t("auth.sendingPing")
                : t("auth.sendPing")}
            </button>

            {pingReference ? (
              <p className="auth-note">
                {t("auth.pingReference", { code: pingReference })}
              </p>
            ) : null}

            <button
              type="button"
              className="btn-secondary"
              onClick={handleApproveMobilePing}
              disabled={pingState !== "sent"}
            >
              {t("auth.approvePing")}
            </button>
          </div>
        ) : null}

        <div className="auth-biometric">
          <button
            type="button"
            className="btn-secondary"
            onClick={handleBiometricSignIn}
            disabled={
              isAuthenticating || (isMobileClient && pingState !== "approved")
            }
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
