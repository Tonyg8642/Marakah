import { useMemo, useState } from "react";
import "./Home.css";

const NAME_KEY = "marakah_user_name";

const reminders = [
  {
    title: "Remember Allah",
    text: "Verily, in the remembrance of Allah do hearts find rest.",
    reason:
      "Regular remembrance keeps the heart calm, strengthens trust in Allah, and helps you respond with wisdom during stress.",
  },
  {
    title: "Protect Your Salah",
    text: "Prayer is your daily connection with Allah.",
    reason:
      "Salah builds discipline, keeps your day anchored around worship, and protects you from drifting into harmful habits.",
  },
  {
    title: "Practice Gratitude",
    text: "Thank Allah for every blessing, big or small.",
    reason:
      "Gratitude shifts focus from what is missing to what Allah has provided, which increases contentment and spiritual strength.",
  },
  {
    title: "Give Charity",
    text: "Every act of kindness is rewarded.",
    reason:
      "Charity purifies wealth, supports people in need, and grows mercy in your heart while earning reward from Allah.",
  },
  {
    title: "Have Patience",
    text: "Allah is with those who are patient.",
    reason:
      "Patience helps you stay principled through tests, avoid regretful reactions, and remain hopeful in Allah's plan.",
  },
  {
    title: "Read the Qur'an",
    text: "Spend a few minutes reading and reflecting today.",
    reason:
      "Reading Qur'an gives guidance, heals spiritual emptiness, and keeps your decisions aligned with truth and purpose.",
  },
];

export default function Home() {
  const [expandedReasons, setExpandedReasons] = useState({});
  const userName = useMemo(
    () => localStorage.getItem(NAME_KEY) || "Tony Glass",
    [],
  );

  function toggleReason(title) {
    setExpandedReasons((current) => ({
      ...current,
      [title]: !current[title],
    }));
  }

  return (
    <main className="home">
      <section className="hero">
        <h1>Welcome to Marakah</h1>

        <p>
          Strengthen your faith through reminders, lectures, and beneficial
          Islamic knowledge.
        </p>

        <button>Explore</button>
      </section>

      <section className="welcome-user" aria-label="Welcome user">
        <h2>Welcome {userName}</h2>
      </section>

      <section className="reminders">
        <h2>Today's Reminders</h2>

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
                {expandedReasons[reminder.title] ? "Read Less" : "Read More"}
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
