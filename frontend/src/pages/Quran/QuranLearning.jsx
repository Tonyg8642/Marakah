import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  fetchQuranLearningManifest,
  fetchQuranLearningSurah,
  fetchQuranSurahIndex,
} from "../../services/quran-learning/quranLearningApi";
import SisterBadiaVideoSeries from "../../components/SisterBadiaVideoSeries/SisterBadiaVideoSeries";
import "./QuranLearning.css";

const SETTINGS_KEY = "marakah_quran_learning_settings";
const PROGRESS_KEY = "marakah_quran_learning_progress";
const THEME_KEY = "marakah_quran_learning_theme";

const DEFAULT_SETTINGS = {
  showPronunciation: true,
  showWordMeanings: true,
  showFullTranslation: true,
  showArabicWordMatching: false,
};

function readJsonStorage(key, fallback) {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return fallback;
    }

    return {
      ...fallback,
      ...parsed,
    };
  } catch {
    return fallback;
  }
}

function saveJsonStorage(key, value) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

function normalizeText(value) {
  return String(value || "").trim();
}

function isRtlText(value) {
  return /[\u0590-\u08FF]/.test(String(value || ""));
}

function findAyahByRef(ayahs, targetAyahNumber) {
  return ayahs.find((ayah) => ayah.ayahNumber === targetAyahNumber) || null;
}

function buildTooltip(word) {
  if (!word) {
    return "";
  }

  return [word.arabic, word.pronunciation, word.meaning]
    .filter(Boolean)
    .join("\n");
}

export default function QuranLearning() {
  const { t } = useTranslation();
  const containerRef = useRef(null);
  const [manifest, setManifest] = useState(null);
  const [surahIndex, setSurahIndex] = useState([]);
  const [isLoadingIndex, setIsLoadingIndex] = useState(true);
  const [isLoadingSurah, setIsLoadingSurah] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSurahNumber, setSelectedSurahNumber] = useState(0);
  const [selectedAyahNumber, setSelectedAyahNumber] = useState(0);
  const [surahData, setSurahData] = useState(null);
  const [highlightedWordRef, setHighlightedWordRef] = useState(null);
  const [settings, setSettings] = useState(() =>
    readJsonStorage(SETTINGS_KEY, DEFAULT_SETTINGS),
  );
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") {
      return "light";
    }

    return window.localStorage.getItem(THEME_KEY) || "light";
  });
  const [errorMessage, setErrorMessage] = useState("");

  const filteredSurahs = useMemo(() => {
    const query = normalizeText(searchQuery).toLowerCase();
    if (!query) {
      return surahIndex;
    }

    return surahIndex.filter((entry) => entry.searchableTokens.includes(query));
  }, [searchQuery, surahIndex]);

  const selectedAyah = useMemo(
    () => findAyahByRef(surahData?.ayahs || [], selectedAyahNumber),
    [selectedAyahNumber, surahData?.ayahs],
  );

  const selectedAyahWordLookup = useMemo(() => {
    const map = new Map();
    if (!selectedAyah) {
      return map;
    }

    selectedAyah.words.forEach((word) => {
      map.set(word.position, word);
    });

    return map;
  }, [selectedAyah]);

  const themeLabel = theme === "dark" ? "Light mode" : "Dark mode";

  useEffect(() => {
    let cancelled = false;

    async function loadIndex() {
      setIsLoadingIndex(true);
      setErrorMessage("");
      try {
        const [nextManifest, nextIndex] = await Promise.all([
          fetchQuranLearningManifest(),
          fetchQuranSurahIndex(),
        ]);

        if (cancelled) {
          return;
        }

        setManifest(nextManifest);
        setSurahIndex(nextIndex);

        const storedProgress = readJsonStorage(PROGRESS_KEY, {
          currentSurah: 0,
          currentAyah: 0,
          scrollY: 0,
        });

        const initialSurah =
          Number(storedProgress.currentSurah || 0) ||
          Number(nextIndex[0]?.surahNumber || 0);
        setSelectedSurahNumber(initialSurah);
        setSelectedAyahNumber(Number(storedProgress.currentAyah || 0));
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error?.message || "Could not load Quran learning datasets.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingIndex(false);
        }
      }
    }

    loadIndex();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    saveJsonStorage(SETTINGS_KEY, settings);
  }, [settings]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (!selectedSurahNumber) {
      return;
    }

    let cancelled = false;
    async function loadSurah() {
      setIsLoadingSurah(true);
      setErrorMessage("");
      setHighlightedWordRef(null);
      try {
        const loaded = await fetchQuranLearningSurah(selectedSurahNumber);
        if (cancelled) {
          return;
        }

        setSurahData(loaded);

        const persisted = readJsonStorage(PROGRESS_KEY, {
          currentSurah: 0,
          currentAyah: 0,
          scrollY: 0,
        });

        if (
          Number(persisted.currentSurah || 0) === selectedSurahNumber &&
          Number(persisted.currentAyah || 0)
        ) {
          setSelectedAyahNumber(Number(persisted.currentAyah));
        } else {
          setSelectedAyahNumber(Number(loaded.ayahs[0]?.ayahNumber || 0));
        }

        if (typeof window !== "undefined") {
          window.requestAnimationFrame(() => {
            const saved = readJsonStorage(PROGRESS_KEY, {
              currentSurah: 0,
              currentAyah: 0,
              scrollY: 0,
            });
            if (Number(saved.currentSurah || 0) === selectedSurahNumber) {
              window.scrollTo({
                top: Number(saved.scrollY || 0),
                behavior: "auto",
              });
            }
          });
        }
      } catch (error) {
        if (!cancelled) {
          setSurahData(null);
          setErrorMessage(error?.message || "Could not load selected surah.");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingSurah(false);
        }
      }
    }

    loadSurah();

    return () => {
      cancelled = true;
    };
  }, [selectedSurahNumber]);

  useEffect(() => {
    const onScroll = () => {
      saveJsonStorage(PROGRESS_KEY, {
        currentSurah: selectedSurahNumber,
        currentAyah: selectedAyahNumber,
        scrollY: window.scrollY,
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [selectedAyahNumber, selectedSurahNumber]);

  useEffect(() => {
    saveJsonStorage(PROGRESS_KEY, {
      currentSurah: selectedSurahNumber,
      currentAyah: selectedAyahNumber,
      scrollY: typeof window !== "undefined" ? window.scrollY : 0,
    });
  }, [selectedAyahNumber, selectedSurahNumber]);

  const handleSelectSurah = useCallback((surahNumber) => {
    setSelectedSurahNumber(Number(surahNumber || 0));
  }, []);

  const handleSelectAyah = useCallback((ayahNumber) => {
    setSelectedAyahNumber(Number(ayahNumber || 0));
  }, []);

  const toggleSetting = useCallback((key) => {
    setSettings((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }, []);

  function handleWordInteract(position) {
    if (!selectedAyah) {
      return;
    }

    const nextRef = {
      surahNumber: selectedAyah.surahNumber,
      ayahNumber: selectedAyah.ayahNumber,
      position,
    };

    if (
      highlightedWordRef &&
      highlightedWordRef.surahNumber === nextRef.surahNumber &&
      highlightedWordRef.ayahNumber === nextRef.ayahNumber &&
      highlightedWordRef.position === nextRef.position
    ) {
      setHighlightedWordRef(null);
      return;
    }

    setHighlightedWordRef(nextRef);
  }

  const guideText = [
    "Read the Arabic first.",
    "Use the pronunciation underneath to help you say each word.",
    "Use the word meanings to understand what each Arabic word means.",
    "Finally read the full translation to understand the complete message.",
  ];

  return (
    <main
      className={`quran-learning quran-learning--${theme}`}
      ref={containerRef}
    >
      <section
        className="quran-learning__hero"
        aria-labelledby="quran-guide-title"
      >
        <div>
          <p className="quran-learning__eyebrow">Quran Learning Mode</p>
          <h1 id="quran-guide-title">Beginner Quran Reading Guide</h1>
        </div>

        <button
          type="button"
          className="btn-secondary quran-learning__theme-toggle"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-pressed={theme === "dark"}
        >
          {themeLabel}
        </button>

        <ol className="quran-learning__guide-list">
          {guideText.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>
      </section>

      <section
        className="quran-learning__controls"
        aria-label="Learning controls"
      >
        <label className="quran-learning__search">
          <span>
            {t("quran.searchLabel", { defaultValue: "Search Surahs" })}
          </span>
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t("quran.searchPlaceholder", {
              defaultValue:
                "Search by surah number, Arabic name, English name, or transliteration",
            })}
            autoComplete="off"
          />
        </label>

        <div
          className="quran-learning__toggles"
          role="group"
          aria-label="Learning settings"
        >
          <label>
            <input
              type="checkbox"
              checked={!settings.showPronunciation}
              onChange={() => toggleSetting("showPronunciation")}
            />
            Hide Pronunciation
          </label>
          <label>
            <input
              type="checkbox"
              checked={!settings.showWordMeanings}
              onChange={() => toggleSetting("showWordMeanings")}
            />
            Hide Word Meanings
          </label>
          <label>
            <input
              type="checkbox"
              checked={!settings.showFullTranslation}
              onChange={() => toggleSetting("showFullTranslation")}
            />
            Hide Full Translation
          </label>
          <label>
            <input
              type="checkbox"
              checked={settings.showArabicWordMatching}
              onChange={() => toggleSetting("showArabicWordMatching")}
            />
            Show Arabic Word Matching
          </label>
        </div>
      </section>

      {manifest?.datasetStatus !== "ready" ? (
        <section className="quran-learning__warning" role="status">
          <h2>Verified datasets are required</h2>
          <p>
            This learning mode does not generate Quran text, transliteration,
            translations, or word meanings. Add verified datasets in
            public/quran-learning to activate full lessons.
          </p>
        </section>
      ) : null}

      {errorMessage ? (
        <section className="quran-learning__error" role="alert">
          {errorMessage}
        </section>
      ) : null}

      <div className="quran-learning__content">
        <aside className="quran-learning__surah-list" aria-label="Surah list">
          {isLoadingIndex ? <p>Loading surah index...</p> : null}
          {!isLoadingIndex && !filteredSurahs.length ? (
            <p>No surah matches your search.</p>
          ) : null}

          {filteredSurahs.map((surah) => (
            <button
              key={surah.surahNumber}
              type="button"
              className={
                surah.surahNumber === selectedSurahNumber
                  ? "quran-learning__surah-item is-active"
                  : "quran-learning__surah-item"
              }
              onClick={() => handleSelectSurah(surah.surahNumber)}
            >
              <span>Surah {surah.surahNumber}</span>
              <strong>{surah.englishName || surah.transliterationName}</strong>
              <small dir={isRtlText(surah.arabicName) ? "rtl" : "ltr"}>
                {surah.arabicName}
              </small>
            </button>
          ))}
        </aside>

        <section
          className="quran-learning__lesson"
          aria-label="Ayah learning cards"
        >
          {isLoadingSurah ? <p>Loading surah lesson...</p> : null}
          {!isLoadingSurah && !surahData?.ayahs?.length ? (
            <p>No ayah lesson data available for this surah yet.</p>
          ) : null}

          {(surahData?.ayahs || []).map((ayah) => {
            const isActiveAyah = ayah.ayahNumber === selectedAyahNumber;
            return (
              <article
                key={ayah.id}
                className={`ayah-card ${isActiveAyah ? "is-active" : ""}`}
                id={`ayah-${ayah.surahNumber}-${ayah.ayahNumber}`}
              >
                <header className="ayah-card__header">
                  <h2>Ayah {ayah.ayahNumber}</h2>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => handleSelectAyah(ayah.ayahNumber)}
                  >
                    Focus Ayah
                  </button>
                </header>

                <div className="ayah-card__arabic" dir="rtl" lang="ar">
                  {(ayah.words || []).length ? (
                    ayah.words.map((word) => {
                      const isHighlighted =
                        highlightedWordRef &&
                        highlightedWordRef.surahNumber === ayah.surahNumber &&
                        highlightedWordRef.ayahNumber === ayah.ayahNumber &&
                        highlightedWordRef.position === word.position;
                      return (
                        <button
                          key={`${ayah.id}:${word.position}`}
                          type="button"
                          className={`ayah-word ${isHighlighted ? "is-highlighted" : ""}`}
                          onClick={() => handleWordInteract(word.position)}
                          title={buildTooltip(word)}
                        >
                          {word.arabic}
                        </button>
                      );
                    })
                  ) : (
                    <p>{ayah.arabicText}</p>
                  )}
                </div>

                {settings.showPronunciation ? (
                  <section className="ayah-card__pronunciation">
                    <h3>Beginner Pronunciation</h3>
                    <p>{ayah.beginnerPronunciation}</p>
                  </section>
                ) : null}

                {settings.showWordMeanings ? (
                  <section className="ayah-card__words">
                    <h3>Word-by-word meanings</h3>
                    <div className="word-grid">
                      {ayah.words.map((word) => {
                        const isHighlighted =
                          highlightedWordRef &&
                          highlightedWordRef.surahNumber === ayah.surahNumber &&
                          highlightedWordRef.ayahNumber === ayah.ayahNumber &&
                          highlightedWordRef.position === word.position;

                        return (
                          <button
                            key={`${ayah.id}:word-card:${word.position}`}
                            type="button"
                            className={`word-card ${isHighlighted ? "is-highlighted" : ""}`}
                            onClick={() => handleWordInteract(word.position)}
                            title={buildTooltip(word)}
                          >
                            {settings.showArabicWordMatching ? (
                              <span
                                className="word-card__arabic"
                                dir="rtl"
                                lang="ar"
                              >
                                {word.arabic}
                              </span>
                            ) : null}
                            {settings.showPronunciation ? (
                              <span className="word-card__pronunciation">
                                {word.pronunciation}
                              </span>
                            ) : null}
                            <span className="word-card__meaning">
                              {word.meaning}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ) : null}

                {settings.showFullTranslation ? (
                  <section className="ayah-card__translation">
                    <h3>Full Meaning</h3>
                    <p>{ayah.fullTranslation}</p>
                  </section>
                ) : null}
              </article>
            );
          })}
        </section>
      </div>

      <SisterBadiaVideoSeries />
    </main>
  );
}
