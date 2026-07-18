import {
  toBeginnerTransliteration,
  toSlowPronunciation,
} from "../utils/quranFormatting";
import {
  validateQuranData,
  validateQuranPage,
  validateSurahData,
} from "../utils/quranValidation";

const QURAN_COM_BASE = "https://api.quran.com/api/v4";
const ALQURAN_BASE = "https://api.alquran.cloud/v1";
const ENGLISH_TRANSLATION_ID = 20;
const TRANSLITERATION_ID = 1;

const responseCache = new Map();

async function readJson(url) {
  if (responseCache.has(url)) {
    return responseCache.get(url);
  }

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Quran request failed (${response.status})`);
  }

  const payload = await response.json();
  responseCache.set(url, payload);
  return payload;
}

function normalizeWord(word) {
  return {
    position: Number(word?.position || 0),
    arabic: String(word?.text_uthmani || word?.text || "").trim(),
    beginnerTransliteration: toBeginnerTransliteration(
      word?.transliteration?.text || "",
    ),
    slowTransliteration: toSlowPronunciation(word?.transliteration?.text || ""),
    meanings: {
      en: String(word?.translation?.text || "").trim(),
    },
  };
}

function normalizeVerse(verse) {
  const [surahNumber, ayahNumber] = String(verse?.verse_key || "0:0")
    .split(":")
    .map((part) => Number(part || 0));

  return {
    pageNumber: Number(verse?.page_number || 0),
    surahNumber,
    ayahNumber,
    arabic: String(verse?.text_uthmani || "").trim(),
    beginnerTransliteration: toBeginnerTransliteration(
      verse?.transliteration?.text || "",
    ),
    slowTransliteration: toSlowPronunciation(
      verse?.transliteration?.text || "",
    ),
    meanings: {
      en: String(verse?.translations?.[0]?.text || "").trim(),
    },
    words: Array.isArray(verse?.words)
      ? verse.words
          .map((word) => normalizeWord(word))
          .filter((word) => word.position > 0)
      : [],
  };
}

function normalizeSurah(raw) {
  return {
    number: Number(raw?.id || raw?.number || 0),
    nameArabic: String(raw?.name_arabic || raw?.name || "").trim(),
    nameBeginner: String(raw?.name_simple || raw?.englishName || "").trim(),
    meaning: {
      en: String(
        raw?.translated_name?.name || raw?.englishNameTranslation || "",
      ).trim(),
    },
    numberOfAyahs: Number(raw?.verses_count || raw?.numberOfAyahs || 0),
    startPage: Number(Array.isArray(raw?.pages) ? raw.pages[0] : 0),
  };
}

export async function getSurahs() {
  const quranComPayload = await readJson(
    `${QURAN_COM_BASE}/chapters?language=en`,
  );
  const alQuranPayload = await readJson(`${ALQURAN_BASE}/surah`);

  const surahsFromQuranCom = Array.isArray(quranComPayload?.chapters)
    ? quranComPayload.chapters.map(normalizeSurah)
    : [];

  const arabicMap = new Map(
    (Array.isArray(alQuranPayload?.data) ? alQuranPayload.data : []).map(
      (surah) => [
        Number(surah?.number || 0),
        {
          arabicName: String(surah?.name || "").trim(),
          englishName: String(surah?.englishName || "").trim(),
          englishMeaning: String(surah?.englishNameTranslation || "").trim(),
        },
      ],
    ),
  );

  const merged = surahsFromQuranCom.map((surah) => {
    const match = arabicMap.get(surah.number);
    return {
      ...surah,
      nameArabic: match?.arabicName || surah.nameArabic,
      nameBeginner: match?.englishName || surah.nameBeginner,
      meaning: {
        en: match?.englishMeaning || surah.meaning.en,
      },
    };
  });

  const issues = validateQuranData({ surahs: merged });
  if (issues.length) {
    console.warn("Quran validation warnings:", issues);
  }

  return merged;
}

export async function getSurah(surahNumber) {
  const surahs = await getSurahs();
  return (
    surahs.find((surah) => surah.number === Number(surahNumber || 0)) || null
  );
}

export async function getPageForSurah(surahNumber) {
  const surah = await getSurah(surahNumber);
  return Number(surah?.startPage || 1);
}

export async function getQuranPage(pageNumber) {
  const safePageNumber = Number(pageNumber || 1);
  const url = `${QURAN_COM_BASE}/verses/by_page/${safePageNumber}?language=en&words=true&word_fields=text_uthmani,position,verse_key&translations=${ENGLISH_TRANSLATION_ID}&transliteration=${TRANSLITERATION_ID}&fields=text_uthmani`;
  const payload = await readJson(url);

  const ayahs = Array.isArray(payload?.verses)
    ? payload.verses.map((verse) => normalizeVerse(verse))
    : [];

  const page = {
    pageNumber: safePageNumber,
    ayahs,
  };

  const issues = validateQuranPage(page);
  if (issues.length) {
    console.warn("Quran page validation warnings:", issues);
  }

  return page;
}

export async function getArabicQuranPage(pageNumber) {
  const page = await getQuranPage(pageNumber);
  return {
    pageNumber: page.pageNumber,
    ayahs: page.ayahs.map((ayah) => ({
      surahNumber: ayah.surahNumber,
      ayahNumber: ayah.ayahNumber,
      arabic: ayah.arabic,
    })),
  };
}

export async function getTransliterationQuranPage(pageNumber) {
  return getQuranPage(pageNumber);
}

export async function getAyahWordData(surahNumber, ayahNumber, pageNumber) {
  const page = await getQuranPage(pageNumber);
  const match = page.ayahs.find(
    (ayah) =>
      ayah.surahNumber === Number(surahNumber || 0) &&
      ayah.ayahNumber === Number(ayahNumber || 0),
  );

  return match?.words || [];
}
