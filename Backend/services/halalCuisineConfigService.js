const halalCuisineConfig = require("../../shared/halal-cuisine-config.json");

function normalizeString(value) {
  return String(value || "").trim();
}

function normalizeCuisineEntry(entry) {
  return {
    id: normalizeString(entry.id),
    name: normalizeString(entry.name),
    category: normalizeString(entry.category),
    region: normalizeString(entry.region),
    countryCode: entry.countryCode ? normalizeString(entry.countryCode) : null,
    requiresHalalEvidence: Boolean(entry.requiresHalalEvidence),
    isTopLevel: Boolean(entry.isTopLevel),
    searchTerms: Array.isArray(entry.searchTerms)
      ? entry.searchTerms.map((item) => normalizeString(item)).filter(Boolean)
      : [],
  };
}

const HALAL_CUISINES = halalCuisineConfig
  .map(normalizeCuisineEntry)
  .filter((entry) => entry.id && entry.name && entry.searchTerms.length > 0);

const HALAL_CUISINES_BY_ID = new Map(
  HALAL_CUISINES.map((entry) => [entry.id, entry]),
);

function getHalalCuisineById(cuisineId) {
  const normalized = normalizeString(cuisineId).toLowerCase();
  if (!normalized) {
    return null;
  }

  return HALAL_CUISINES_BY_ID.get(normalized) || null;
}

function getHalalCuisineSearchTerms(cuisineId) {
  const cuisine = getHalalCuisineById(cuisineId);
  return cuisine ? [...cuisine.searchTerms] : [];
}

function listHalalCuisines() {
  return HALAL_CUISINES.map((entry) => ({ ...entry }));
}

module.exports = {
  getHalalCuisineById,
  getHalalCuisineSearchTerms,
  listHalalCuisines,
};
