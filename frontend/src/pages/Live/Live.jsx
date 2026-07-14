const streamRooms = [
  { title: "Maghrib Reflection", host: "Ustadh Hamza", viewers: "1.3K" },
  { title: "Qur'an Circle", host: "Shaykh Idris", viewers: "840" },
  { title: "Youth Q&A", host: "Sister Maryam", viewers: "520" },
];

export default function Live() {
  return (
    <main className="page">
      <section className="page-hero">
        <p className="eyebrow">Live Sessions</p>
        <h1>Join beneficial broadcasts in real time</h1>
      </section>

      <section className="card-grid three">
        {streamRooms.map((room) => (
          <article className="surface-card" key={room.title}>
            <span className="pill live">LIVE</span>
            <h3>{room.title}</h3>
            <p>Host: {room.host}</p>
            <p>{room.viewers} watching now</p>
            <button type="button" className="btn-secondary">
              Join Stream
            </button>
          </article>
        ))}
      </section>

      <section className="surface-panel">
        <h2>Today's Schedule</h2>
        <ul className="list-rows">
          <li>5:15 PM - Evening Adhkar</li>
          <li>7:00 PM - Tafsir Session</li>
          <li>9:00 PM - Open Q&A</li>
        </ul>
      </section>
    </main>
  );
}
