import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import TranslatedContent from "../../components/Translations/TranslatedContent";
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
      <section
        className="hero"
        aria-label={t("home.heroRegionAria", {
          defaultValue: "Welcome to Marakah",
        })}
      >
        <TranslatedContent
          as="h1"
          className="home-translated-block"
          originalText={t("home.heroTitle")}
        />

        <TranslatedContent
          as="p"
          className="home-translated-block"
          originalText={t("home.heroText")}
        />

        <Link
          className="hero__cta"
          to="/events"
          aria-label={t("home.exploreEventsAria", {
            defaultValue: "Explore events",
          })}
        >
          {t("home.explore")}
        </Link>
      </section>

      <section
        className="welcome-user"
        aria-label={t("home.welcomeAria", { defaultValue: "Welcome user" })}
      >
        <h2>{t("home.userWelcome", { name: userName })}</h2>
      </section>

      <section className="reminders" aria-labelledby="today-reminders-heading">
        <h2 id="today-reminders-heading">{t("home.todayReminders")}</h2>

        <div className="reminders__grid">
          {reminders.map((reminder) => (
            <article className="reminder-card" key={reminder.title}>
              <TranslatedContent
                as="h3"
                className="home-translated-block"
                originalText={reminder.title}
              />
              <TranslatedContent
                as="p"
                className="home-translated-block"
                originalText={reminder.text}
              />
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
                <TranslatedContent
                  as="p"
                  className="reminder-card__reason home-translated-block"
                  originalText={reminder.reason}
                />
              )}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
