import { useTranslation } from "react-i18next";

const scholars = [
  { name: "Shaykh Idris", specialty: "Tafsir & Aqidah" },
  { name: "Ustadh Hamza", specialty: "Seerah & Character" },
  { name: "Sister Maryam", specialty: "Family & Tarbiyah" },
];

export default function Scholars() {
  const { t } = useTranslation();

  return (
    <main className="page">
      <section className="page-hero">
        <p className="eyebrow">{t("scholars.eyebrow")}</p>
        <h1>{t("scholars.title")}</h1>
      </section>

      <section className="card-grid three">
        {scholars.map((scholar) => (
          <article className="surface-card" key={scholar.name}>
            <h3>{scholar.name}</h3>
            <p>{scholar.specialty}</p>
            <button type="button" className="btn-secondary">
              {t("scholars.viewSessions")}
            </button>
          </article>
        ))}
      </section>
    </main>
  );
}
