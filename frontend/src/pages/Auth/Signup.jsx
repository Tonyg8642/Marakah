export default function Signup() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-symbols" aria-label="Islamic symbols">
          <div className="auth-symbol">
            <span className="auth-symbol__arabic" lang="ar">
              الله
            </span>
            <span className="auth-symbol__label">Allah</span>
          </div>
          <div className="auth-symbol">
            <span className="auth-symbol__arabic" lang="ar">
              محمد
            </span>
            <span className="auth-symbol__label">Muhammad</span>
          </div>
        </div>

        <h1>Create Account</h1>
        <p>Join the Marakah community in minutes.</p>

        <form className="auth-form">
          <label htmlFor="signup-name">Full Name</label>
          <input id="signup-name" type="text" placeholder="Your full name" />

          <label htmlFor="signup-email">Email</label>
          <input id="signup-email" type="email" placeholder="you@example.com" />

          <label htmlFor="signup-password">Password</label>
          <input
            id="signup-password"
            type="password"
            placeholder="Create password"
          />

          <button type="submit" className="btn-primary">
            Sign Up
          </button>
        </form>
      </section>
    </main>
  );
}
