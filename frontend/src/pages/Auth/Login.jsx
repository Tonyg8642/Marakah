import { useState } from "react";
import { useNavigate } from "react-router-dom";

const CREDENTIAL_KEY = "marakah_webauthn_credential_id";
const SIGNED_IN_KEY = "marakah_is_signed_in";
const NAME_KEY = "marakah_user_name";

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
  const navigate = useNavigate();
  const [authMessage, setAuthMessage] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  function saveSession(name) {
    localStorage.setItem(SIGNED_IN_KEY, "true");
    localStorage.setItem(NAME_KEY, name || "Tony Glass");
  }

  async function handleBiometricSignIn() {
    if (!window.PublicKeyCredential || !navigator.credentials) {
      setAuthMessage(
        "Biometric sign-in is not supported on this device/browser.",
      );
      return;
    }

    const isPlatformAuthAvailable =
      await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();

    if (!isPlatformAuthAvailable) {
      setAuthMessage("No Face ID/Fingerprint authenticator is available.");
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
      setAuthMessage("Biometric sign-in successful.");
      navigate("/");
    } catch {
      setAuthMessage(
        "Biometric sign-in was cancelled or failed. Please try again.",
      );
    } finally {
      setIsAuthenticating(false);
    }
  }

  function handlePasswordSignIn(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nameFromEmail = (form.get("email") || "").toString().split("@")[0];
    const normalizedName = nameFromEmail
      ? nameFromEmail
          .split(/[._-]/)
          .filter(Boolean)
          .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
          .join(" ")
      : "Tony Glass";

    saveSession(normalizedName);
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

        <h1>Welcome Back</h1>
        <p>Sign in to continue your learning journey.</p>

        <form className="auth-form" onSubmit={handlePasswordSignIn}>
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            name="email"
            type="email"
            placeholder="you@example.com"
          />

          <label htmlFor="login-password">Password</label>
          <input id="login-password" type="password" placeholder="••••••••" />

          <button type="submit" className="btn-primary">
            Log In
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
              ? "Authenticating..."
              : "Use Face ID / Fingerprint"}
          </button>
          {authMessage && <p className="auth-note">{authMessage}</p>}
        </div>
      </section>
    </main>
  );
}
