export const QURAN_PAGE_QUERY_KEY = "page";

export function normalizePageNumber(input, fallback = 1) {
  const parsed = Number(input || 0);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

export function getPageFromSearchParams(searchParams, fallback = 1) {
  return normalizePageNumber(searchParams.get(QURAN_PAGE_QUERY_KEY), fallback);
}

export function buildPageSearch(pageNumber) {
  return `?${QURAN_PAGE_QUERY_KEY}=${normalizePageNumber(pageNumber, 1)}`;
}
