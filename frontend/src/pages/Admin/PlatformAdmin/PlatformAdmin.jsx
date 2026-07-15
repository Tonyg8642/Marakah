import "./PlatformAdmin.css";
import { useTranslation } from "react-i18next";

export default function PlatformAdmin() {
  const { t } = useTranslation();

  return (
    <main className="page platform-admin">
      <section className="page-hero">
        <p className="eyebrow">{t("admin.platformControl")}</p>
        <h1>{t("admin.platformTitle")}</h1>
      </section>

      <section className="dashboard-grid" aria-label="Platform metrics">
        <article className="card">
          <h2>{t("admin.totalMasjids")}</h2>
          <p>128</p>
        </article>

        <article className="card">
          <h2>{t("admin.totalUsers")}</h2>
          <p>19,402</p>
        </article>

        <article className="card">
          <h2>{t("admin.pendingApprovals")}</h2>
          <p>17</p>
        </article>

        <article className="card">
          <h2>{t("admin.totalDonations")}</h2>
          <p>$84.2K</p>
        </article>
      </section>
    </main>
  );
}
