const events = [
  { name: "Family Halaqah", date: "Jul 18, 2026", venue: "Main Hall" },
  { name: "Youth Night", date: "Jul 20, 2026", venue: "Community Center" },
  { name: "Qur'an Competition", date: "Jul 27, 2026", venue: "Masjid Al-Noor" },
];

export default function Events() {
  return (
    <main className="page">
      <section className="page-hero">
        <p className="eyebrow">Calendar</p>
        <h1>Upcoming events for the ummah</h1>
      </section>

      <section className="card-grid three">
        {events.map((event) => (
          <article className="surface-card" key={event.name}>
            <h3>{event.name}</h3>
            <p>{event.date}</p>
            <p>{event.venue}</p>
            <button type="button" className="btn-secondary">
              RSVP
            </button>
          </article>
        ))}
      </section>
    </main>
  );
}
