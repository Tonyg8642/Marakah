export default function ProfileStatCard({
  title,
  value,
  supportingText,
  statusText,
}) {
  return (
    <article className="surface-card profile-stat-card" role="listitem">
      <h3>{title}</h3>
      <p className="metric profile-stat-value">{value}</p>
      <p className="profile-stat-supporting">{supportingText}</p>
      {statusText ? <p className="profile-stat-status">{statusText}</p> : null}
    </article>
  );
}
