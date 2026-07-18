const fs = require("node:fs");
const path = require("node:path");

const CATALOG_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "shared",
  "language-catalog.json",
);

function normalizeToken(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");
}

function normalizeTag(value) {
  const raw = normalizeToken(value);
  if (!raw) {
    return "";
  }

  const parts = raw.split("-").filter(Boolean);
  if (!parts.length) {
    return "";
  }

  if (parts.length === 1) {
    return parts[0];
  }

  const [base, ...rest] = parts;
  const normalizedRest = rest.map((part) => {
    if (part.length === 2) {
      return part.toUpperCase();
    }
    return part;
  });

  return [base, ...normalizedRest].join("-");
}

function loadCatalogEntries() {
  const raw = fs.readFileSync(CATALOG_PATH, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.filter(
    (entry) => entry && typeof entry === "object" && entry.id && entry.tag,
  );
}

function buildFallbackChain(entry) {
  if (!entry || typeof entry !== "object") {
    return ["en"];
  }

  const normalizedTag = normalizeTag(entry.tag);
  const normalizedBase = normalizeTag(entry.baseLanguage);
  const normalizedFallback = normalizeTag(entry.fallbackTag);
  const normalizedLocale = normalizeTag(entry.interfaceLocale);
  const explicit = Array.isArray(entry.fallbackChain)
    ? entry.fallbackChain.map((item) => normalizeTag(item)).filter(Boolean)
    : [];

  return [
    normalizedTag,
    normalizedLocale,
    normalizedFallback,
    normalizedBase,
    normalizedTag.split("-")[0],
    "en",
    ...explicit,
  ].filter((item, index, arr) => item && arr.indexOf(item) === index);
}

function normalizeCatalogEntry(entry) {
  const fallbackChain = buildFallbackChain(entry);
  const interfaceLocale =
    normalizeTag(entry.interfaceLocale) ||
    fallbackChain.find((item) => item.length <= 3) ||
    "en";

  return {
    ...entry,
    tag: normalizeTag(entry.tag),
    baseLanguage: normalizeTag(entry.baseLanguage) || normalizeTag(entry.tag),
    interfaceLocale,
    fallbackTag: normalizeTag(entry.fallbackTag) || interfaceLocale,
    providerTag:
      normalizeTag(entry.providerTag) ||
      normalizeTag(entry.fallbackTag) ||
      normalizeTag(entry.baseLanguage) ||
      normalizeTag(entry.tag),
    fallbackChain,
  };
}

const catalogEntries = loadCatalogEntries().map(normalizeCatalogEntry);

const catalogByTag = new Map(
  catalogEntries.map((entry) => [normalizeToken(entry.tag), entry]),
);
const catalogById = new Map(
  catalogEntries.map((entry) => [normalizeToken(entry.id), entry]),
);

function resolveLanguageEntry(value) {
  const token = normalizeToken(value);
  if (!token) {
    return null;
  }

  if (catalogByTag.has(token)) {
    return catalogByTag.get(token);
  }

  if (catalogById.has(token)) {
    return catalogById.get(token);
  }

  const base = token.split("-")[0];
  if (catalogByTag.has(base)) {
    return catalogByTag.get(base);
  }

  return null;
}

function isSelectableEntry(entry) {
  return Boolean(entry && entry.active && entry.selectable);
}

function getLanguageCatalog() {
  return catalogEntries.filter(isSelectableEntry);
}

function normalizePreferredLanguageTag(value) {
  const entry = resolveLanguageEntry(value);
  if (!entry || !isSelectableEntry(entry)) {
    return null;
  }

  return normalizeTag(entry.tag);
}

function resolvePreferredLanguage(value) {
  const entry = resolveLanguageEntry(value);
  if (!entry || !isSelectableEntry(entry)) {
    return null;
  }

  return {
    id: normalizeToken(entry.id),
    tag: normalizeTag(entry.tag),
    entry,
  };
}

function isGeneralTranslationAllowed(entry) {
  if (!entry || typeof entry !== "object") {
    return false;
  }

  const id = normalizeToken(entry.id);
  const tag = normalizeToken(entry.tag);
  if (id.includes("quranic") || tag.includes("quranic")) {
    return false;
  }

  return entry.allowedInGeneralTranslator !== false;
}

function getSupportedLanguageTags() {
  return new Set(getLanguageCatalog().map((entry) => normalizeTag(entry.tag)));
}

module.exports = {
  getLanguageCatalog,
  getSupportedLanguageTags,
  normalizePreferredLanguageTag,
  resolvePreferredLanguage,
  isGeneralTranslationAllowed,
  normalizeTag,
  resolveLanguageEntry,
};
