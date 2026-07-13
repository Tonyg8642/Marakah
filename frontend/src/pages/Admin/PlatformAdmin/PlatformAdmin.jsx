import "./PlatformAdmin.css";

export default function PlatformAdmin() {
  return (
    <div className="platform-admin">
      <h1>Platform Administration</h1>

      <div className="dashboard-grid">
        <div className="card">
          <h2>Total Masjids</h2>
          <p>0</p>
        </div>

        <div className="card">
          <h2>Total Users</h2>
          <p>0</p>
        </div>

        <div className="card">
          <h2>Pending Approvals</h2>
          <p>0</p>
        </div>

        <div className="card">
          <h2>Total Donations</h2>
          <p>$0</p>
        </div>
      </div>
    </div>
  );
}
