const scholars = [
  { name: "Shaykh Idris", specialty: "Tafsir & Aqidah" },
  { name: "Ustadh Hamza", specialty: "Seerah & Character" },
  { name: "Sister Maryam", specialty: "Family & Tarbiyah" },
];

export default function Scholars() {
  return (
    <main className="page">
      <section className="page-hero">
        <p className="eyebrow">Teachers</p>
        <h1>Learn from trusted scholars and educators</h1>
      </section>

      <section className="card-grid three">
        {scholars.map((scholar) => (
          <article className="surface-card" key={scholar.name}>
            <h3>{scholar.name}</h3>
            <p>{scholar.specialty}</p>
            <button type="button" className="btn-secondary">
              View Sessions
            </button>
          </article>
        ))}
      </section>
    </main>
  );
}
