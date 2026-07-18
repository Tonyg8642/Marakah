const BASE_PATH = "/quran-learning";

const memoryCache = new Map();

async function readJson(path) {
  if (memoryCache.has(path)) {
    return memoryCache.get(path);
  }

  const response = await fetch(path, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Could not load dataset file: ${path}`);
  }

  const payload = await response.json();
  memoryCache.set(path, payload);
  return payload;
}

function normalizeWord(word, ayahRef) {
  const position = Number(word?.position || word?.wordPosition || 0);
  if (!position) {
    return null;
  }

  return {
    surahNumber: ayahRef.surahNumber,
    ayahNumber: ayahRef.ayahNumber,
    position,
    arabic: String(word?.arabic || word?.arabicText || "").trim(),
    pronunciation: String(
      word?.pronunciation || word?.beginnerPronunciation || "",
    ).trim(),
    meaning: String(word?.meaning || word?.translation || "").trim(),
  };
}

function normalizeAyah(rawAyah, surahNumber) {
  const ayahNumber = Number(rawAyah?.ayahNumber || rawAyah?.verseNumber || 0);
  if (!ayahNumber) {
    return null;
  }

  const ayahRef = {
    surahNumber,
    ayahNumber,
  };

  const words = Array.isArray(rawAyah?.words)
    ? rawAyah.words
        .map((word) => normalizeWord(word, ayahRef))
        .filter(Boolean)
        .sort((a, b) => a.position - b.position)
    : [];

  return {
    surahNumber,
    ayahNumber,
    id: `${surahNumber}:${ayahNumber}`,
    arabicText: String(rawAyah?.arabicText || rawAyah?.text || "").trim(),
    beginnerPronunciation: String(
      rawAyah?.beginnerPronunciation || rawAyah?.pronunciation || "",
    ).trim(),
    fullTranslation: String(rawAyah?.fullTranslation || "").trim(),
    words,
  };
}

function normalizeSurah(rawSurah) {
  const surahNumber = Number(rawSurah?.surahNumber || rawSurah?.id || 0);
  if (!surahNumber) {
    return null;
  }

  const ayahs = Array.isArray(rawSurah?.ayahs)
    ? rawSurah.ayahs
        .map((ayah) => normalizeAyah(ayah, surahNumber))
        .filter(Boolean)
        .sort((a, b) => a.ayahNumber - b.ayahNumber)
    : [];

  return {
    surahNumber,
    arabicName: String(rawSurah?.arabicName || "").trim(),
    englishName: String(rawSurah?.englishName || "").trim(),
    transliterationName: String(rawSurah?.transliterationName || "").trim(),
    ayahCount: Number(rawSurah?.ayahCount || ayahs.length || 0),
    ayahs,
  };
}

export async function fetchQuranLearningManifest() {
  const payload = await readJson(`${BASE_PATH}/manifest.json`);
  return {
    version: String(payload?.version || "").trim(),
    datasetStatus: String(payload?.datasetStatus || "missing").trim(),
    sources: payload?.sources || {},
    notes: String(payload?.notes || "").trim(),
  };
}

export async function fetchQuranSurahIndex() {
  const payload = await readJson(`${BASE_PATH}/surah-index.json`);
  const entries = Array.isArray(payload?.surahs) ? payload.surahs : [];

  return entries
    .map((entry) => ({
      surahNumber: Number(entry?.surahNumber || entry?.id || 0),
      arabicName: String(entry?.arabicName || "").trim(),
      englishName: String(entry?.englishName || "").trim(),
      transliterationName: String(entry?.transliterationName || "").trim(),
      ayahCount: Number(entry?.ayahCount || 0),
      searchableTokens: [
        String(entry?.surahNumber || "").trim(),
        String(entry?.arabicName || "").trim(),
        String(entry?.englishName || "").trim(),
        String(entry?.transliterationName || "").trim(),
      ]
        .join(" ")
        .toLowerCase(),
    }))
    .filter((entry) => entry.surahNumber > 0)
    .sort((a, b) => a.surahNumber - b.surahNumber);
}

export async function fetchQuranLearningSurah(surahNumber) {
  const safeSurahNumber = Number(surahNumber || 0);
  if (!safeSurahNumber) {
    throw new Error("A valid surah number is required.");
  }

  const payload = await readJson(`${BASE_PATH}/surahs/${safeSurahNumber}.json`);
  const normalized = normalizeSurah(payload);
  if (!normalized) {
    throw new Error("Surah dataset file is invalid.");
  }

  return normalized;
}
