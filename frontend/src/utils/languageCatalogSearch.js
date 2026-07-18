function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, " ")
    .trim();
}

function toSearchableValues(entry) {
  return [
    entry?.name,
    entry?.nativeName,
    entry?.id,
    entry?.tag,
    entry?.baseLanguage,
    entry?.region,
    entry?.script,
    entry?.classification,
    ...(Array.isArray(entry?.countries) ? entry.countries : []),
    ...(Array.isArray(entry?.alternateNames) ? entry.alternateNames : []),
    ...(Array.isArray(entry?.searchTerms) ? entry.searchTerms : []),
  ]
    .filter(Boolean)
    .map((value) => normalizeSearchText(value));
}

export function rankLanguageCatalog(entries, query, selectedTag) {
  const normalizedQuery = normalizeSearchText(query);
  const selected = normalizeSearchText(selectedTag);
  const safeEntries = Array.isArray(entries) ? entries : [];

  const withRank = safeEntries
    .map((entry) => {
      const values = toSearchableValues(entry);
      const tag = normalizeSearchText(entry?.tag);
      const exactMatch = normalizedQuery
        ? values.some((value) => value === normalizedQuery)
        : false;
      const startsWithMatch = normalizedQuery
        ? values.some((value) => value.startsWith(normalizedQuery))
        : false;
      const containsMatch = normalizedQuery
        ? values.some((value) => value.includes(normalizedQuery))
        : true;

      if (!containsMatch && tag !== selected) {
        return null;
      }

      const rank = exactMatch
        ? 0
        : startsWithMatch
          ? 1
          : normalizedQuery
            ? 2
            : 3;
      const preferredBoost = tag && tag === selected ? -0.25 : 0;

      return {
        entry,
        rank: rank + preferredBoost,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (a.rank !== b.rank) {
        return a.rank - b.rank;
      }

      return String(a.entry?.name || "").localeCompare(
        String(b.entry?.name || ""),
      );
    })
    .map((item) => item.entry);

  return withRank;
}

export function getLanguageSupportSummary(entry) {
  if (!entry || typeof entry !== "object") {
    return "";
  }

  const directionLabel = entry.direction === "rtl" ? "RTL" : "LTR";
  const interfaceLabel = String(entry.interfaceStatus || "fallback");
  const translationLabel = String(
    entry.translationStatus || "provider-dependent",
  );
  const dialectLabel = entry.exactDialectSupported
    ? "Exact dialect supported"
    : "Dialect falls back to parent language";

  return [
    entry.region,
    entry.classification,
    directionLabel,
    `Interface: ${interfaceLabel}`,
    `Translation: ${translationLabel}`,
    dialectLabel,
  ]
    .filter(Boolean)
    .join(" | ");
}
