const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

const fallbackCatalog = [
  {
    id: "english",
    name: "English",
    nativeName: "English",
    tag: "en",
    direction: "ltr",
    interfaceLocale: "en",
    interfaceStatus: "full",
    translationStatus: "provider-supported",
    exactDialectSupported: true,
    fallbackTag: "en",
    fallbackChain: ["en"],
    active: true,
    selectable: true,
  },
  {
    id: "arabic-msa",
    name: "Modern Standard Arabic",
    nativeName: "العربية الفصحى",
    tag: "ar",
    direction: "rtl",
    interfaceLocale: "ar",
    interfaceStatus: "full",
    translationStatus: "provider-supported",
    exactDialectSupported: true,
    fallbackTag: "ar",
    fallbackChain: ["ar", "en"],
    active: true,
    selectable: true,
  },
  {
    id: "farsi",
    name: "Farsi",
    nativeName: "فارسی",
    tag: "fa",
    direction: "rtl",
    interfaceLocale: "fa",
    interfaceStatus: "full",
    translationStatus: "provider-supported",
    exactDialectSupported: true,
    fallbackTag: "fa",
    fallbackChain: ["fa", "en"],
    active: true,
    selectable: true,
  },
  {
    id: "urdu",
    name: "Urdu",
    nativeName: "اردو",
    tag: "ur",
    direction: "rtl",
    interfaceLocale: "ur",
    interfaceStatus: "full",
    translationStatus: "provider-supported",
    exactDialectSupported: true,
    fallbackTag: "ur",
    fallbackChain: ["ur", "en"],
    active: true,
    selectable: true,
  },
  {
    id: "somali",
    name: "Somali",
    nativeName: "Soomaali",
    tag: "so",
    direction: "ltr",
    interfaceLocale: "so",
    interfaceStatus: "full",
    translationStatus: "provider-supported",
    exactDialectSupported: true,
    fallbackTag: "so",
    fallbackChain: ["so", "en"],
    active: true,
    selectable: true,
  },
  {
    id: "spanish",
    name: "Spanish",
    nativeName: "Espanol",
    tag: "es",
    direction: "ltr",
    interfaceLocale: "es",
    interfaceStatus: "full",
    translationStatus: "provider-supported",
    exactDialectSupported: true,
    fallbackTag: "es",
    fallbackChain: ["es", "en"],
    active: true,
    selectable: true,
  },
];

export async function fetchLanguageCatalog() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/preferences/languages`);
    if (!response.ok) {
      return fallbackCatalog;
    }

    const payload = await response.json();
    const list = Array.isArray(payload?.languages)
      ? payload.languages
      : fallbackCatalog;

    return list.filter((entry) => entry && entry.tag);
  } catch {
    return fallbackCatalog;
  }
}

export function getFallbackLanguageCatalog() {
  return fallbackCatalog;
}
