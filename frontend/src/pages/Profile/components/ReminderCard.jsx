import { useTranslation } from "react-i18next";

export default function ReminderCard({
  item,
  onEdit,
  onDelete,
  onTogglePinned,
}) {
  const { t } = useTranslation();

  return (
    <article className="surface-card profile-item-card">
      <div className="profile-item-head">
        <h3>{item.title}</h3>
        <span
          className={`profile-pin ${item.isPinned ? "profile-pin--active" : ""}`}
        >
          {item.isPinned
            ? t("profile.card.pinned")
            : t("profile.card.notPinned")}
        </span>
      </div>
      <p>{item.text}</p>
      {item.category ? (
        <p>
          <strong>{t("profile.card.category")}:</strong> {item.category}
        </p>
      ) : null}
      {item.source ? (
        <p>
          <strong>{t("profile.card.source")}:</strong> {item.source}
        </p>
      ) : null}
      {item.note ? (
        <p>
          <strong>{t("profile.card.personalNote")}:</strong> {item.note}
        </p>
      ) : null}
      <p>
        <strong>{t("profile.card.dateSaved")}:</strong>{" "}
        {item.dateSaved || t("profile.card.notSpecified")}
      </p>
      <div className="profile-item-actions">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => onTogglePinned(item.id)}
        >
          {item.isPinned
            ? t("profile.actions.unpin")
            : t("profile.actions.pin")}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => onEdit(item.id)}
        >
          {t("profile.actions.edit")}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => onDelete(item.id)}
        >
          {t("profile.actions.delete")}
        </button>
      </div>
    </article>
  );
}
