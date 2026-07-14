const posts = [
  {
    author: "Amina S.",
    content: "Started memorizing Surah Al-Mulk this week.",
  },
  {
    author: "Yusuf M.",
    content: "Reminder: community iftar planning this Friday.",
  },
  {
    author: "Masjid Al-Noor",
    content: "Volunteer spots open for weekend classes.",
  },
];

export default function Feed() {
  return (
    <main className="page">
      <section className="page-hero">
        <p className="eyebrow">Community Feed</p>
        <h1>Stay connected with beneficial updates</h1>
      </section>

      <section className="stack">
        {posts.map((post, index) => (
          <article className="surface-card" key={`${post.author}-${index}`}>
            <h3>{post.author}</h3>
            <p>{post.content}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
