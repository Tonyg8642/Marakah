export default function Profile() {
  return (
    <main className="page">
      <section className="page-hero">
        <p className="eyebrow">My Profile</p>
        <h1>Track your growth and activity</h1>
      </section>

      <section className="card-grid three">
        <article className="surface-card">
          <h3>Lectures Watched</h3>
          <p className="metric">42</p>
        </article>
        <article className="surface-card">
          <h3>Streak</h3>
          <p className="metric">15 days</p>
        </article>
        <article className="surface-card">
          <h3>Saved Reminders</h3>
          <p className="metric">27</p>
        </article>
      </section>
    </main>
  );
}
