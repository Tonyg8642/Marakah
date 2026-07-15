import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

const recordings = [
  {
    id: "recording-purifying-intentions",
    title: "Friday Khutbah: Purifying Intentions",
  },
  {
    id: "recording-mercy-in-madinah",
    title: "Seerah Gems: Mercy in Madinah",
  },
  {
    id: "recording-guarding-the-tongue",
    title: "Tazkiyah: Guarding the Tongue",
  },
  {
    id: "recording-raising-children",
    title: "Family Circle: Raising Children with Ihsan",
  },
];

const SAVED_RECORDINGS_KEY = "marakah_saved_recordings_v1";
const RECORDING_HISTORY_KEY = "marakah_recording_history_v1";

function readStringArray(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((value) => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

function readHistoryArray(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter(
          (item) =>
            item &&
            typeof item.id === "string" &&
            typeof item.title === "string" &&
            typeof item.playedAt === "string",
        )
      : [];
  } catch {
    return [];
  }
}

export default function Recordings() {
  const { t } = useTranslation();
  const [savedRecordingIds, setSavedRecordingIds] = useState([]);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    setSavedRecordingIds(readStringArray(SAVED_RECORDINGS_KEY));
    setHistory(readHistoryArray(RECORDING_HISTORY_KEY));
  }, []);

  useEffect(() => {
    localStorage.setItem(
      SAVED_RECORDINGS_KEY,
      JSON.stringify(savedRecordingIds),
    );
  }, [savedRecordingIds]);

  useEffect(() => {
    localStorage.setItem(RECORDING_HISTORY_KEY, JSON.stringify(history));
  }, [history]);

  const savedSet = useMemo(
    () => new Set(savedRecordingIds),
    [savedRecordingIds],
  );

  function handleToggleSaved(recordingId) {
    setSavedRecordingIds((current) => {
      if (current.includes(recordingId)) {
        return current.filter((id) => id !== recordingId);
      }

      return [recordingId, ...current];
    });
  }

  function handlePlayRecording(recording) {
    setHistory((current) => {
      const entry = {
        id: recording.id,
        title: recording.title,
        playedAt: new Date().toISOString(),
      };

      return [entry, ...current].slice(0, 15);
    });
  }

  return (
    <main className="page">
      <section className="page-hero">
        <p className="eyebrow">{t("recordings.eyebrow")}</p>
        <h1>{t("recordings.title")}</h1>
      </section>

      <section className="card-grid two">
        {recordings.map((recording) => (
          <article className="surface-card" key={recording.id}>
            <h3>{recording.title}</h3>
            <p>{t("recordings.duration")}</p>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => handlePlayRecording(recording)}
            >
              {t("recordings.play")}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => handleToggleSaved(recording.id)}
            >
              {savedSet.has(recording.id)
                ? t("recordings.remove")
                : t("recordings.save")}
            </button>
          </article>
        ))}
      </section>

      <section className="surface-panel stack">
        <h2>{t("recordings.historyTitle")}</h2>
        {history.length ? (
          <ul className="list-rows" aria-label={t("recordings.historyAria")}>
            {history.map((entry, index) => (
              <li key={`${entry.id}-${entry.playedAt}-${index}`}>
                {entry.title}
              </li>
            ))}
          </ul>
        ) : (
          <p>{t("recordings.historyEmpty")}</p>
        )}
      </section>
    </main>
  );
}
