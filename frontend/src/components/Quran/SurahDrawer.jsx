import { useMemo, useState } from "react";
import "./SurahDrawer.css";

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .trim();
}

export default function SurahDrawer({
  isOpen,
  surahs,
  selectedSurahNumber,
  onClose,
  onSelectSurah,
  title = "Surahs",
}) {
  const [query, setQuery] = useState("");

  const filteredSurahs = useMemo(() => {
    const normalizedQuery = normalize(query);
    if (!normalizedQuery) {
      return surahs;
    }

    return surahs.filter((surah) => {
      const haystack = [
        surah.number,
        surah.nameArabic,
        surah.nameBeginner,
        surah.meaning?.en,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [query, surahs]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="surah-drawer__backdrop"
      role="presentation"
      onClick={onClose}
    >
      <aside
        className="surah-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="surah-drawer__header">
          <h2>{title}</h2>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </header>

        <label className="surah-drawer__search">
          <span>Search Surahs</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by number, Arabic, English, or transliteration"
          />
        </label>

        <div
          className="surah-drawer__list"
          role="listbox"
          aria-label="Surah list"
        >
          {filteredSurahs.map((surah) => {
            const isActive = Number(selectedSurahNumber || 0) === surah.number;
            return (
              <button
                key={surah.number}
                type="button"
                className={`surah-drawer__item ${isActive ? "is-active" : ""}`}
                onClick={() => {
                  onSelectSurah(surah);
                  onClose();
                }}
                aria-current={isActive ? "true" : undefined}
              >
                <span className="surah-drawer__number">{surah.number}</span>
                <div className="surah-drawer__meta">
                  <strong dir="rtl" lang="ar">
                    {surah.nameArabic}
                  </strong>
                  <span>{surah.nameBeginner}</span>
                  <small>{surah.numberOfAyahs} Ayat</small>
                </div>
              </button>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
