import { useTranslation } from "react-i18next";

export default function MasjidDashboard() {
  const { t } = useTranslation();

  return (
    <main className="page">
      <section className="page-hero">
        <p className="eyebrow">{t("admin.masjidAdmin")}</p>
        <h1>{t("admin.masjidTitle")}</h1>
      </section>

      <section className="card-grid three">
        <article className="surface-card">
          <h3>{t("admin.attendance")}</h3>
          <p className="metric">418</p>
        </article>
        <article className="surface-card">
          <h3>{t("admin.classes")}</h3>
          <p className="metric">12</p>
        </article>
        <article className="surface-card">
          <h3>{t("admin.volunteers")}</h3>
          <p className="metric">9</p>
        </article>
      </section>
    </main>
  );
}
