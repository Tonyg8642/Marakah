import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useLanguagePreference } from "../../contexts/LanguageContext";
import { usePageTranslation } from "../../contexts/PageTranslationContext";
import SurahDrawer from "../../components/Quran/SurahDrawer";
import {
  getPageForSurah,
  getSurahs,
  getTransliterationQuranPage,
} from "../../services/quranService";
import { getAyahMeaningsByPage } from "../../services/quranTranslationService";
import {
  toBeginnerTransliteration,
  toSlowPronunciation,
} from "../../utils/quranFormatting";
import {
  buildPageSearch,
  getPageFromSearchParams,
  normalizePageNumber,
} from "../../utils/quranRoutes";
import SisterBadiaVideoSeries from "../../components/SisterBadiaVideoSeries/SisterBadiaVideoSeries";
import "../../components/Quran/SurahDrawer.css";
import "./QuranTransliterationPage.css";

const SETTINGS_KEY = "marakahQuranTransliterationSettings";
const PAGE_KEY = "marakahQuranTransliterationPage";
const PROGRESS_KEY = "marakahQuranTransliterationProgress";
const FINAL_PAGE = 604;

const DEFAULT_SETTINGS = {
  showArabic: false,
  showMeaning: false,
  slowPronunciation: false,
  wordByWordStudy: false,
  showArabicWordMatching: false,
};

function readSettings() {
  if (typeof window === "undefined") {
    return DEFAULT_SETTINGS;
  }

  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    return {
      ...DEFAULT_SETTINGS,
      ...(raw ? JSON.parse(raw) : {}),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function getInitialPage(searchParams) {
  const fromQuery = getPageFromSearchParams(searchParams, 1);
  if (fromQuery > 1) {
    return fromQuery;
  }

  if (typeof window === "undefined") {
    return 1;
  }

  return normalizePageNumber(window.localStorage.getItem(PAGE_KEY), 1);
}

function getAyahKey(ayah) {
  return `${ayah.surahNumber}:${ayah.ayahNumber}`;
}

export default function QuranTransliterationPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { preferredLanguageTag } = useLanguagePreference();
  const { translationEnabled } = usePageTranslation();

  const [settings, setSettings] = useState(readSettings);
  const [surahs, setSurahs] = useState([]);
  const [page, setPage] = useState(null);
  const [meanings, setMeanings] = useState(new Map());
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [expandedAyahKey, setExpandedAyahKey] = useState("");
  const [highlightWordRef, setHighlightWordRef] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [singleAyahArabic, setSingleAyahArabic] = useState({});

  const pageNumber = useMemo(
    () => getInitialPage(searchParams),
    [searchParams],
  );

  const currentSurahNumber = useMemo(
    () => Number(page?.ayahs?.[0]?.surahNumber || 1),
    [page?.ayahs],
  );

  const currentSurah = useMemo(
    () => surahs.find((surah) => surah.number === currentSurahNumber) || null,
    [currentSurahNumber, surahs],
  );

  const effectiveShowMeaning = settings.showMeaning || translationEnabled;

  const bismillah = "Bismillahir Rahmanir Raheem";

  const loadPage = useCallback(
    async (nextPage) => {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const [loadedSurahs, loadedPage, loadedMeanings] = await Promise.all([
          surahs.length ? Promise.resolve(surahs) : getSurahs(),
          getTransliterationQuranPage(nextPage),
          getAyahMeaningsByPage(nextPage, preferredLanguageTag),
        ]);

        setSurahs(loadedSurahs);
        setPage(loadedPage);
        setMeanings(loadedMeanings);

        if (typeof window !== "undefined") {
          window.localStorage.setItem(PAGE_KEY, String(nextPage));
          window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
          window.localStorage.setItem(
            PROGRESS_KEY,
            JSON.stringify({
              pageNumber: nextPage,
              surahNumber: Number(loadedPage?.ayahs?.[0]?.surahNumber || 1),
              ayahNumber: Number(loadedPage?.ayahs?.[0]?.ayahNumber || 1),
              updatedAt: new Date().toISOString(),
            }),
          );
        }
      } catch {
        setErrorMessage("The Quran could not be loaded. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [preferredLanguageTag, settings, surahs],
  );

  useEffect(() => {
    loadPage(pageNumber);
  }, [loadPage, pageNumber]);

  useEffect(() => {
    if (!searchParams.get("page")) {
      setSearchParams(buildPageSearch(pageNumber), { replace: true });
    }
  }, [pageNumber, searchParams, setSearchParams]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }
  }, [settings]);

  const changePage = useCallback(
    (nextPage) => {
      const safePage = normalizePageNumber(nextPage, pageNumber);
      setSearchParams(buildPageSearch(safePage));
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    [pageNumber, setSearchParams],
  );

  const handleSelectSurah = useCallback(
    async (surah) => {
      const pageForSurah = await getPageForSurah(surah.number);
      changePage(pageForSurah);
    },
    [changePage],
  );

  const toggleSetting = useCallback((key) => {
    setSettings((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }, []);

  const handleHighlightWord = useCallback(
    (ayah, word) => {
      if (!word) {
        return;
      }

      const next = {
        surahNumber: ayah.surahNumber,
        ayahNumber: ayah.ayahNumber,
        position: word.position,
      };

      if (
        highlightWordRef &&
        highlightWordRef.surahNumber === next.surahNumber &&
        highlightWordRef.ayahNumber === next.ayahNumber &&
        highlightWordRef.position === next.position
      ) {
        setHighlightWordRef(null);
        return;
      }

      setHighlightWordRef(next);
    },
    [highlightWordRef],
  );

  return (
    <main className="quran-transliteration-page">
      <header
        className="quran-transliteration-controls"
        role="group"
        aria-label="Quran transliteration controls"
      >
        <label>
          <input
            type="checkbox"
            checked={settings.showArabic}
            onChange={() => toggleSetting("showArabic")}
          />
          Show Arabic
        </label>
        <label>
          <input
            type="checkbox"
            checked={settings.showMeaning}
            onChange={() => toggleSetting("showMeaning")}
          />
          Show Meaning
        </label>
        <label>
          <input
            type="checkbox"
            checked={settings.slowPronunciation}
            onChange={() => toggleSetting("slowPronunciation")}
          />
          Slow Pronunciation
        </label>
        <label>
          <input
            type="checkbox"
            checked={settings.wordByWordStudy}
            onChange={() => toggleSetting("wordByWordStudy")}
          />
          Word-by-Word Study
        </label>
        <label>
          <input
            type="checkbox"
            checked={settings.showArabicWordMatching}
            onChange={() => toggleSetting("showArabicWordMatching")}
            disabled={!settings.wordByWordStudy}
          />
          Show Arabic Word Matching
        </label>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setIsDrawerOpen(true)}
          aria-expanded={isDrawerOpen}
        >
          Surahs
        </button>
      </header>

      <section className="quran-transliteration-sheet">
        {isLoading ? <p>Loading Quran...</p> : null}

        {!isLoading && errorMessage ? (
          <div className="quran-transliteration-error" role="alert">
            <p>{errorMessage}</p>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => loadPage(pageNumber)}
            >
              Retry
            </button>
          </div>
        ) : null}

        {!isLoading && !errorMessage && currentSurah ? (
          <>
            <h1 className="quran-transliteration-title">
              {currentSurah.nameBeginner} ({currentSurah.number})
            </h1>
            <p className="quran-transliteration-subtitle">
              {currentSurah.meaning?.en || ""}
            </p>
            {currentSurah.number !== 9 ? (
              <p className="quran-transliteration-bismillah">{bismillah}</p>
            ) : null}

            <ol className="quran-transliteration-list">
              {(page?.ayahs || []).map((ayah, index) => {
                const key = getAyahKey(ayah);
                const previousAyah = index > 0 ? page.ayahs[index - 1] : null;
                const startsNewSurah =
                  index > 0 &&
                  ayah.ayahNumber === 1 &&
                  ayah.surahNumber !== 9 &&
                  (!previousAyah ||
                    previousAyah.surahNumber !== ayah.surahNumber);
                const showAyahArabic =
                  settings.showArabic || singleAyahArabic[key];
                const transliteration = settings.slowPronunciation
                  ? toSlowPronunciation(
                      ayah.slowTransliteration || ayah.beginnerTransliteration,
                    )
                  : toBeginnerTransliteration(ayah.beginnerTransliteration);
                const meaning = meanings.get(key) || ayah.meanings?.en || "";
                const isExpanded =
                  settings.wordByWordStudy && expandedAyahKey === key;

                return (
                  <li key={key} className="quran-transliteration-ayah">
                    <div className="transliteration-line">
                      {startsNewSurah ? (
                        <p className="quran-transliteration-bismillah">
                          {bismillah}
                        </p>
                      ) : null}
                      {showAyahArabic ? (
                        <div
                          className="transliteration-line__arabic"
                          dir="rtl"
                          lang="ar"
                        >
                          {ayah.arabic}
                        </div>
                      ) : null}

                      <div className="transliteration-line__text">
                        <span className="transliteration-line__number">
                          {ayah.ayahNumber}.
                        </span>
                        <span>{transliteration}</span>
                      </div>

                      <div className="transliteration-line__actions">
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() =>
                            setSingleAyahArabic((current) => ({
                              ...current,
                              [key]: !current[key],
                            }))
                          }
                        >
                          {showAyahArabic ? "Hide Arabic" : "Show Arabic"}
                        </button>
                        {settings.wordByWordStudy ? (
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() =>
                              setExpandedAyahKey((current) =>
                                current === key ? "" : key,
                              )
                            }
                            aria-expanded={isExpanded}
                          >
                            {isExpanded ? "Hide Study" : "Word-by-Word Study"}
                          </button>
                        ) : null}
                      </div>

                      {effectiveShowMeaning ? (
                        <p
                          className="transliteration-line__meaning"
                          dir="auto"
                          lang={preferredLanguageTag}
                        >
                          {meaning}
                        </p>
                      ) : null}

                      {isExpanded ? (
                        <div className="quran-word-groups">
                          {ayah.words.map((word) => {
                            const isHighlighted =
                              highlightWordRef &&
                              highlightWordRef.surahNumber ===
                                ayah.surahNumber &&
                              highlightWordRef.ayahNumber === ayah.ayahNumber &&
                              highlightWordRef.position === word.position;

                            return (
                              <button
                                type="button"
                                key={`${key}:${word.position}`}
                                className={`quran-word-group ${isHighlighted ? "is-highlighted" : ""}`}
                                onClick={() => handleHighlightWord(ayah, word)}
                                title={`${word.arabic}\n${word.beginnerTransliteration}\n${word.meanings?.en || ""}`}
                              >
                                {settings.showArabicWordMatching ? (
                                  <div
                                    className="quran-word-group__arabic"
                                    dir="rtl"
                                    lang="ar"
                                  >
                                    {word.arabic}
                                  </div>
                                ) : null}
                                <div className="quran-word-group__pronunciation">
                                  {settings.slowPronunciation
                                    ? toSlowPronunciation(
                                        word.slowTransliteration ||
                                          word.beginnerTransliteration,
                                      )
                                    : toBeginnerTransliteration(
                                        word.beginnerTransliteration,
                                      )}
                                </div>
                                <div
                                  className="quran-word-group__meaning"
                                  dir="auto"
                                  lang={preferredLanguageTag}
                                >
                                  {word.meanings?.en || ""}
                                </div>
                              </button>
                            );
                          })}
                          {effectiveShowMeaning ? (
                            <p
                              className="quran-word-groups__full-meaning"
                              dir="auto"
                              lang={preferredLanguageTag}
                            >
                              {meaning}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          </>
        ) : null}
      </section>

      <footer
        className="quran-transliteration-pager"
        aria-label="Transliteration page navigation"
      >
        <button
          type="button"
          className="btn-secondary"
          onClick={() => changePage(pageNumber - 1)}
          disabled={pageNumber <= 1}
        >
          Previous Page
        </button>
        <p aria-current="page">Page {pageNumber}</p>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => changePage(pageNumber + 1)}
          disabled={pageNumber >= FINAL_PAGE}
        >
          Next Page
        </button>
      </footer>

      <SisterBadiaVideoSeries />

      <SurahDrawer
        isOpen={isDrawerOpen}
        surahs={surahs}
        selectedSurahNumber={currentSurahNumber}
        onClose={() => setIsDrawerOpen(false)}
        onSelectSurah={handleSelectSurah}
        title="Surahs"
      />
    </main>
  );
}
