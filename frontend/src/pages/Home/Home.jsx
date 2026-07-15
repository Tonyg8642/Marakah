import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./Home.css";

const NAME_KEY = "marakah_user_name";

export default function Home() {
  const { t } = useTranslation();
  const [expandedReasons, setExpandedReasons] = useState({});
  const userName = useMemo(() => {
    if (typeof window === "undefined") {
      return "Guest";
    }

    return window.localStorage.getItem(NAME_KEY) || "Guest";
  }, []);

  function toggleReason(title) {
    setExpandedReasons((current) => ({
      ...current,
      [title]: !current[title],
    }));
  }

  const reminders = [
    "remember",
    "salah",
    "gratitude",
    "charity",
    "patience",
    "quran",
  ].map((key) => ({
    key,
    title: t(`home.reminders.${key}.title`),
    text: t(`home.reminders.${key}.text`),
    reason: t(`home.reminders.${key}.reason`),
  }));

  return (
    <main className="home">
      <section className="hero" aria-labelledby="home-hero-heading">
        <h1 id="home-hero-heading">{t("home.heroTitle")}</h1>

        <p>{t("home.heroText")}</p>

        <Link className="hero__cta" to="/events" aria-label="Explore events">
          {t("home.explore")}
        </Link>
      </section>

      <section className="welcome-user" aria-label="Welcome user">
        <h2>{t("home.welcome", { name: userName })}</h2>
      </section>

      <section className="reminders" aria-labelledby="today-reminders-heading">
        <h2 id="today-reminders-heading">{t("home.todayReminders")}</h2>

        <div className="reminders__grid">
          {reminders.map((reminder) => (
            <article className="reminder-card" key={reminder.title}>
              <h3>{reminder.title}</h3>
              <p>{reminder.text}</p>
              <button
                type="button"
                onClick={() => toggleReason(reminder.title)}
                aria-expanded={Boolean(expandedReasons[reminder.title])}
              >
                {expandedReasons[reminder.title]
                  ? t("home.readLess")
                  : t("home.readMore")}
              </button>

              {expandedReasons[reminder.title] && (
                <p className="reminder-card__reason">{reminder.reason}</p>
              )}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
