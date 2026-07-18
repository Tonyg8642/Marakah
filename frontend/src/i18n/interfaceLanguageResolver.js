import {
  DEFAULT_LANGUAGE,
  INTERFACE_LANGUAGE_TAGS,
  isRtlLanguage,
  normalizeLanguageTag,
  resolveInterfaceLanguageTag,
} from "./constants";

function findCatalogEntry(tag, catalog = []) {
  const normalized = normalizeLanguageTag(tag);
  if (!normalized) {
    return null;
  }

  return (
    catalog.find((entry) => normalizeLanguageTag(entry?.tag) === normalized) ||
    null
  );
}

export function resolveInterfaceLanguage(
  preferredLanguageTag,
  languageCatalog = [],
) {
  const requestedTag =
    normalizeLanguageTag(preferredLanguageTag) || DEFAULT_LANGUAGE;
  const preferredEntry = findCatalogEntry(requestedTag, languageCatalog);

  const chainFromCatalog = Array.isArray(preferredEntry?.fallbackChain)
    ? preferredEntry.fallbackChain
    : [];

  const derivedChain = [
    requestedTag,
    normalizeLanguageTag(preferredEntry?.interfaceLocale),
    normalizeLanguageTag(preferredEntry?.fallbackTag),
    normalizeLanguageTag(preferredEntry?.baseLanguage),
    requestedTag.split("-")[0],
    DEFAULT_LANGUAGE,
  ]
    .filter(Boolean)
    .concat(
      chainFromCatalog.map((tag) => normalizeLanguageTag(tag)).filter(Boolean),
    );

  const fallbackChain = [...new Set(derivedChain)];

  const interfaceTag =
    fallbackChain.find((tag) => INTERFACE_LANGUAGE_TAGS.includes(tag)) ||
    resolveInterfaceLanguageTag(requestedTag);

  const exactInterfaceSupported = interfaceTag === requestedTag;
  const resolvedEntry = findCatalogEntry(interfaceTag, languageCatalog) ||
    preferredEntry || {
      tag: interfaceTag,
      direction: isRtlLanguage(interfaceTag) ? "rtl" : "ltr",
    };

  return {
    requestedTag,
    interfaceTag,
    direction:
      resolvedEntry?.direction || (isRtlLanguage(interfaceTag) ? "rtl" : "ltr"),
    exactInterfaceSupported,
    fallbackChain,
    preferredEntry,
    resolvedEntry,
  };
}
