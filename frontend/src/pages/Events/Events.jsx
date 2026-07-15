import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

const events = [
  {
    id: "event-family-halaqah",
    name: "Family Halaqah",
    date: "Jul 18, 2026",
    venue: "Main Hall",
  },
  {
    id: "event-youth-night",
    name: "Youth Night",
    date: "Jul 20, 2026",
    venue: "Community Center",
  },
  {
    id: "event-quran-competition",
    name: "Qur'an Competition",
    date: "Jul 27, 2026",
    venue: "Masjid Al-Noor",
  },
];

const SAVED_EVENTS_KEY = "marakah_saved_events_v1";

function readSavedEvents() {
  try {
    const raw = localStorage.getItem(SAVED_EVENTS_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item) => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

export default function Events() {
  const { t } = useTranslation();
  const [savedEventIds, setSavedEventIds] = useState([]);

  useEffect(() => {
    setSavedEventIds(readSavedEvents());
  }, []);

  useEffect(() => {
    localStorage.setItem(SAVED_EVENTS_KEY, JSON.stringify(savedEventIds));
  }, [savedEventIds]);

  const savedSet = useMemo(() => new Set(savedEventIds), [savedEventIds]);

  function handleToggleSaved(eventId) {
    setSavedEventIds((current) => {
      if (current.includes(eventId)) {
        return current.filter((id) => id !== eventId);
      }

      return [eventId, ...current];
    });
  }

  return (
    <main className="page">
      <section className="page-hero">
        <p className="eyebrow">{t("events.eyebrow")}</p>
        <h1>{t("events.title")}</h1>
      </section>

      <section className="card-grid three">
        {events.map((event) => (
          <article className="surface-card" key={event.id}>
            <h3>{event.name}</h3>
            <p>{event.date}</p>
            <p>{event.venue}</p>
            <button type="button" className="btn-secondary">
              {t("events.rsvp")}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => handleToggleSaved(event.id)}
            >
              {savedSet.has(event.id) ? t("events.remove") : t("events.save")}
            </button>
          </article>
        ))}
      </section>
    </main>
  );
}
