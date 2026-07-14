export default function MasjidDashboard() {
  return (
    <main className="page">
      <section className="page-hero">
        <p className="eyebrow">Masjid Admin</p>
        <h1>Dashboard overview for your local masjid</h1>
      </section>

      <section className="card-grid three">
        <article className="surface-card">
          <h3>Today's Attendance</h3>
          <p className="metric">418</p>
        </article>
        <article className="surface-card">
          <h3>Classes This Week</h3>
          <p className="metric">12</p>
        </article>
        <article className="surface-card">
          <h3>Volunteer Requests</h3>
          <p className="metric">9</p>
        </article>
      </section>
    </main>
  );
}
