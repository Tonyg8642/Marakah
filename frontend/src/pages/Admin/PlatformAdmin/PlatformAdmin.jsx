import "./PlatformAdmin.css";

export default function PlatformAdmin() {
  return (
    <main className="page platform-admin">
      <section className="page-hero">
        <p className="eyebrow">Platform Control</p>
        <h1>Platform Administration</h1>
      </section>

      <div className="dashboard-grid">
        <div className="card">
          <h2>Total Masjids</h2>
          <p>128</p>
        </div>

        <div className="card">
          <h2>Total Users</h2>
          <p>19,402</p>
        </div>

        <div className="card">
          <h2>Pending Approvals</h2>
          <p>17</p>
        </div>

        <div className="card">
          <h2>Total Donations</h2>
          <p>$84.2K</p>
        </div>
      </div>
    </main>
  );
}
