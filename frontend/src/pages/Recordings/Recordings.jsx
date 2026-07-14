const recordings = [
  "Friday Khutbah: Purifying Intentions",
  "Seerah Gems: Mercy in Madinah",
  "Tazkiyah: Guarding the Tongue",
  "Family Circle: Raising Children with Ihsan",
];

export default function Recordings() {
  return (
    <main className="page">
      <section className="page-hero">
        <p className="eyebrow">Library</p>
        <h1>Browse khutbahs and lecture recordings</h1>
      </section>

      <section className="card-grid two">
        {recordings.map((title) => (
          <article className="surface-card" key={title}>
            <h3>{title}</h3>
            <p>Duration: 28-45 min</p>
            <button type="button" className="btn-secondary">
              Play
            </button>
          </article>
        ))}
      </section>
    </main>
  );
}
