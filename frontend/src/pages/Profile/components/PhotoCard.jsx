import { useTranslation } from "react-i18next";

export default function PhotoCard({ item, onEdit, onDelete }) {
  const { t } = useTranslation();

  return (
    <article className="surface-card profile-item-card profile-photo-card">
      <img
        className="profile-photo-preview"
        src={item.imageDataUrl}
        alt={item.imageAlt || item.title || t("profile.card.savedMemory")}
        loading="lazy"
      />
      <h3>{item.title || t("profile.card.untitledMemory")}</h3>
      {item.caption ? <p>{item.caption}</p> : null}
      <p>
        <strong>{t("profile.card.date")}:</strong>{" "}
        {item.date || t("profile.card.notSpecified")}
      </p>
      <p>
        <strong>{t("profile.card.linkedActivity")}:</strong>{" "}
        {item.relatedActivityTitle || t("profile.card.none")}
      </p>
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
