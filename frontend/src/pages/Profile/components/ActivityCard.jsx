import { useTranslation } from "react-i18next";

export default function ActivityCard({ item, onEdit, onDelete }) {
  const { t } = useTranslation();

  return (
    <article className="surface-card profile-item-card">
      <div className="profile-item-head">
        <h3>{item.title}</h3>
        <span className="profile-item-type">
          {item.eventType || t("profile.card.lectureEvent")}
        </span>
      </div>
      <p>
        <strong>{t("profile.card.speaker")}:</strong>{" "}
        {item.speaker || t("profile.card.notSpecified")}
      </p>
      <p>
        <strong>{t("profile.card.venue")}:</strong>{" "}
        {item.venue || t("profile.card.notSpecified")}
      </p>
      <p>
        <strong>{t("profile.card.dateAttended")}:</strong>{" "}
        {item.dateAttended || t("profile.card.notSpecified")}
      </p>
      {item.notes ? (
        <p>
          <strong>{t("profile.card.notes")}:</strong> {item.notes}
        </p>
      ) : null}
      {item.photoDataUrl ? (
        <img
          className="profile-inline-photo"
          src={item.photoDataUrl}
          alt={item.photoAlt || `${item.title} related memory`}
          loading="lazy"
        />
      ) : null}
      <div className="profile-item-actions">
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
