import { useTranslation } from "react-i18next";

const streamRooms = [
  { title: "Maghrib Reflection", host: "Ustadh Hamza", viewers: "1.3K" },
  { title: "Qur'an Circle", host: "Shaykh Idris", viewers: "840" },
  { title: "Youth Q&A", host: "Sister Maryam", viewers: "520" },
];

export default function Live() {
  const { t } = useTranslation();

  return (
    <main className="page">
      <section className="page-hero">
        <p className="eyebrow">{t("live.eyebrow")}</p>
        <h1>{t("live.title")}</h1>
      </section>

      <section className="card-grid three">
        {streamRooms.map((room) => (
          <article className="surface-card" key={room.title}>
            <span className="pill live">LIVE</span>
            <h3>{room.title}</h3>
            <p>
              {t("live.host")}: {room.host}
            </p>
            <p>{t("live.watchingNow", { count: room.viewers })}</p>
            <button type="button" className="btn-secondary">
              {t("live.joinStream")}
            </button>
          </article>
        ))}
      </section>

      <section className="surface-panel">
        <h2>{t("live.schedule")}</h2>
        <ul className="list-rows">
          <li>{t("live.items.one")}</li>
          <li>{t("live.items.two")}</li>
          <li>{t("live.items.three")}</li>
        </ul>
      </section>
    </main>
  );
}
