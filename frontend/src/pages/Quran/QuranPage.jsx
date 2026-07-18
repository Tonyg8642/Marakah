import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLanguagePreference } from "../../contexts/LanguageContext";
import { usePageTranslation } from "../../contexts/PageTranslationContext";
import SurahDrawer from "../../components/Quran/SurahDrawer";
import {
  getArabicQuranPage,
  getPageForSurah,
  getSurahs,
} from "../../services/quranService";
import { getAyahMeaningsByPage } from "../../services/quranTranslationService";
import { formatArabicNumber } from "../../utils/quranFormatting";
import {
  buildPageSearch,
  getPageFromSearchParams,
  normalizePageNumber,
} from "../../utils/quranRoutes";
import "../../components/Quran/SurahDrawer.css";
import "./QuranPage.css";

const PAGE_KEY = "marakahQuranPage";
const READING_PROGRESS_KEY = "marakahQuranReadingProgress";
const FINAL_PAGE = 604;

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

export default function QuranPage() {
  const { preferredLanguageTag } = useLanguagePreference();
  const { translationEnabled, transliterationEnabled } = usePageTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const readerRef = useRef(null);

  const [surahs, setSurahs] = useState([]);
  const [page, setPage] = useState(null);
  const [meanings, setMeanings] = useState(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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

  const bismillahText = "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ";

  const loadPage = useCallback(
    async (nextPage) => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const [loadedSurahs, loadedPage, loadedMeanings] = await Promise.all([
          surahs.length ? Promise.resolve(surahs) : getSurahs(),
          getArabicQuranPage(nextPage),
          getAyahMeaningsByPage(nextPage, preferredLanguageTag),
        ]);

        setSurahs(loadedSurahs);
        setPage(loadedPage);
        setMeanings(loadedMeanings);

        if (typeof window !== "undefined") {
          window.localStorage.setItem(PAGE_KEY, String(nextPage));
          window.localStorage.setItem(
            READING_PROGRESS_KEY,
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
    [preferredLanguageTag, surahs],
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
    if (
      !isLoading &&
      readerRef.current &&
      typeof readerRef.current.scrollIntoView === "function"
    ) {
      readerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [isLoading, pageNumber]);

  const changePage = useCallback(
    (nextPage) => {
      const safePage = normalizePageNumber(nextPage, pageNumber);
      setSearchParams(buildPageSearch(safePage));
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

  return (
    <main className="quran-page">
      <header className="quran-page__header">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setIsDrawerOpen(true)}
          aria-expanded={isDrawerOpen}
        >
          Surahs
        </button>
        <div className="quran-page__header-title">
          <h1 dir="rtl" lang="ar">
            {currentSurah?.nameArabic || "القرآن الكريم"}
          </h1>
          {currentSurah?.nameBeginner ? (
            <p>{currentSurah.nameBeginner}</p>
          ) : null}
        </div>
        {transliterationEnabled ? (
          <button
            type="button"
            className="btn-secondary"
            onClick={() =>
              navigate(`/quran-transliteration${buildPageSearch(pageNumber)}`)
            }
          >
            Open Quran Transliteration
          </button>
        ) : (
          <span className="quran-page__spacer" aria-hidden="true" />
        )}
      </header>

      <section className="quran-page__sheet" ref={readerRef}>
        {isLoading ? (
          <p className="quran-page__status">Loading Quran...</p>
        ) : null}

        {!isLoading && errorMessage ? (
          <div className="quran-page__error" role="alert">
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

        {!isLoading && !errorMessage && page ? (
          <>
            {pageNumber === 1 ? (
              <p className="quran-page__bismillah" dir="rtl" lang="ar">
                {bismillahText}
              </p>
            ) : null}

            <div className="quran-arabic-reader" dir="rtl" lang="ar">
              {page.ayahs.map((ayah, index) => {
                const key = `${ayah.surahNumber}:${ayah.ayahNumber}`;
                const previousAyah = index > 0 ? page.ayahs[index - 1] : null;
                const startsNewSurah =
                  ayah.ayahNumber === 1 &&
                  ayah.surahNumber !== 9 &&
                  ayah.surahNumber !== 1 &&
                  (!previousAyah ||
                    previousAyah.surahNumber !== ayah.surahNumber);
                return (
                  <span key={key} className="quran-arabic-ayah">
                    {startsNewSurah ? (
                      <span className="quran-page__inline-bismillah">
                        {bismillahText}
                      </span>
                    ) : null}
                    {ayah.arabic}
                    <span
                      className="quran-ayah-number"
                      aria-label={`Ayah ${ayah.ayahNumber}`}
                    >
                      {formatArabicNumber(ayah.ayahNumber)}
                    </span>

                    {translationEnabled && meanings.get(key) ? (
                      <span
                        className="quran-ayah-meaning"
                        dir="auto"
                        lang={preferredLanguageTag}
                      >
                        {meanings.get(key)}
                      </span>
                    ) : null}
                  </span>
                );
              })}
            </div>
          </>
        ) : null}
      </section>

      <footer className="quran-page__pager" aria-label="Quran page navigation">
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
