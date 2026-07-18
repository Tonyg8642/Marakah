import { normalizeLanguageTag } from "../i18n/constants";

const ALQURAN_BASE = "https://api.alquran.cloud/v1";

const EDITION_BY_BASE_LANGUAGE = {
  ar: "ar.muyassar",
  en: "en.asad",
  so: "en.asad",
  ur: "ur.jalandhry",
  fa: "fa.ghomshei",
  es: "es.cortes",
  fr: "fr.hamidullah",
  de: "de.bubenheim",
  ru: "ru.kuliev",
  hi: "hi.hindi",
  ja: "ja.japanese",
  ko: "ko.korean",
  zh: "zh.jian",
};

const cache = new Map();

function getEditionForLanguage(languageTag) {
  const normalized = normalizeLanguageTag(languageTag) || "en";
  const base = normalized.split("-")[0];
  return EDITION_BY_BASE_LANGUAGE[base] || "en.asad";
}

async function readJson(url) {
  if (cache.has(url)) {
    return cache.get(url);
  }

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Translation request failed (${response.status})`);
  }

  const payload = await response.json();
  cache.set(url, payload);
  return payload;
}

export async function getAyahMeaningsByPage(pageNumber, preferredLanguageTag) {
  const safePageNumber = Number(pageNumber || 1);
  const edition = getEditionForLanguage(preferredLanguageTag);
  const fallbackEdition = "en.asad";

  async function fetchEdition(targetEdition) {
    const payload = await readJson(
      `${ALQURAN_BASE}/page/${safePageNumber}/${targetEdition}`,
    );
    const ayahs = Array.isArray(payload?.data?.ayahs) ? payload.data.ayahs : [];

    return new Map(
      ayahs.map((ayah) => [
        `${ayah?.surah?.number}:${ayah?.numberInSurah}`,
        String(ayah?.text || "").trim(),
      ]),
    );
  }

  try {
    return await fetchEdition(edition);
  } catch {
    return fetchEdition(fallbackEdition);
  }
}
