import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLanguagePreference } from "../../contexts/LanguageContext";
import { saveSession } from "../../auth/session";

export default function Signup() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { language, changeLanguage, isSaving } = useLanguagePreference();
  const [selectedLanguage, setSelectedLanguage] = useState(language);

  const languageOptions = useMemo(
    () => ["en", "ar", "fa", "ur", "so", "es"],
    [],
  );

  async function handleLanguageChange(event) {
    const nextLanguage = event.target.value;
    setSelectedLanguage(nextLanguage);
    await changeLanguage(nextLanguage);
  }

  function handleSignupSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim() || "Guest";
    const email = String(form.get("email") || "").trim();

    saveSession(name, email);
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

          <label htmlFor="signup-language">{t("language.label")}</label>
          <select
            id="signup-language"
            value={selectedLanguage}
            onChange={handleLanguageChange}
            disabled={isSaving}
          >
            {languageOptions.map((option) => (
              <option key={option} value={option}>
                {t(`language.options.${option}`)}
              </option>
            ))}
          </select>

          <button type="submit" className="btn-primary">
            {t("auth.signup")}
          </button>
        </form>
      </section>
    </main>
  );
}
