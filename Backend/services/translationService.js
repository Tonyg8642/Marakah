const {
  getLanguageCatalog,
  normalizeTag,
  resolveLanguageEntry,
  isGeneralTranslationAllowed,
} = require("./languageCatalogService");

const MAX_TEXT_LENGTH = 5000;
const RATE_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_COUNT = 20;
const CACHE_TTL_MS = 30 * 60 * 1000;

const requestWindow = new Map();
const translationCache = new Map();

function cleanupRateWindows(now) {
  for (const [key, value] of requestWindow.entries()) {
    if (!value || now - value.windowStart >= RATE_WINDOW_MS) {
      requestWindow.delete(key);
    }
  }
}

function cleanupCache(now) {
  for (const [key, value] of translationCache.entries()) {
    if (!value || now - value.createdAt >= CACHE_TTL_MS) {
      translationCache.delete(key);
    }
  }
}

function getActorKey(context = {}) {
  return (
    String(context.identifier || context.ip || "anonymous").trim() ||
    "anonymous"
  );
}

function validateRateLimit(context = {}) {
  const now = Date.now();
  cleanupRateWindows(now);

  const actorKey = getActorKey(context);
  const current = requestWindow.get(actorKey);

  if (!current || now - current.windowStart >= RATE_WINDOW_MS) {
    requestWindow.set(actorKey, {
      count: 1,
      windowStart: now,
    });
    return true;
  }

  if (current.count >= RATE_LIMIT_COUNT) {
    return false;
  }

  current.count += 1;
  requestWindow.set(actorKey, current);
  return true;
}

function buildFallbackNotice(entry, requestedTag) {
  if (!entry || entry.exactDialectSupported) {
    return "";
  }

  const fallbackTag = normalizeTag(
    entry.fallbackTag || entry.baseLanguage || "ar",
  );
  if (!fallbackTag || fallbackTag === requestedTag) {
    return "";
  }

  return `This provider currently returns ${fallbackTag} because exact ${entry.name} output is unavailable.`;
}

function resolveProviderLanguage(requestedTargetTag) {
  const normalizedRequested = normalizeTag(requestedTargetTag);
  if (!normalizedRequested) {
    return {
      ok: false,
      message: "A valid BCP 47 language tag is required.",
    };
  }

  if (normalizedRequested.toLowerCase().includes("quranic")) {
    return {
      ok: false,
      message:
        "Quranic Arabic is reserved for a separate Quran-focused feature.",
    };
  }

  const entry = resolveLanguageEntry(normalizedRequested);
  if (!entry) {
    return {
      ok: false,
      message: "Requested language is not supported in the catalog.",
    };
  }

  if (!isGeneralTranslationAllowed(entry)) {
    return {
      ok: false,
      message:
        "Requested language is not available in the general translation route.",
    };
  }

  const providerTag = normalizeTag(
    entry.providerTag || entry.fallbackTag || entry.baseLanguage || entry.tag,
  );
  const requestedTag = normalizeTag(entry.tag) || normalizedRequested;
  const exactDialectSupported = Boolean(entry.exactDialectSupported);
  const fallbackNotice = buildFallbackNotice(entry, requestedTag);

  return {
    ok: true,
    requestedTag,
    requestedLanguageId: entry.id,
    requestedLanguageName: entry.name,
    providerTag,
    exactDialectSupported,
    fallbackNotice,
  };
}

function getSupportedTranslationLanguages() {
  return getLanguageCatalog().filter(isGeneralTranslationAllowed);
}

function buildCacheKey(payload) {
  return [
    normalizeTag(payload.sourceLanguage || "auto"),
    normalizeTag(payload.requestedTargetTag || ""),
    payload.includeTransliteration ? "with-translit" : "native-only",
    String(payload.text || "").trim(),
  ].join("||");
}

async function callProvider({
  text,
  sourceLanguage,
  providerTag,
  includeTransliteration,
}) {
  const providerUrl = String(process.env.TRANSLATION_PROVIDER_URL || "").trim();
  if (!providerUrl) {
    const error = new Error("Translation provider is not configured.");
    error.code = "PROVIDER_NOT_CONFIGURED";
    throw error;
  }

  const body = {
    q: text,
    source: normalizeTag(sourceLanguage) || "auto",
    target: providerTag,
    format: "text",
    includeTransliteration: Boolean(includeTransliteration),
  };

  const headers = {
    "Content-Type": "application/json",
  };

  const apiKey = String(process.env.TRANSLATION_PROVIDER_API_KEY || "").trim();
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const response = await fetch(providerUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const textBody = await response.text();
    const error = new Error(
      `Translation provider failed (${response.status}). ${textBody || ""}`,
    );
    error.code = "PROVIDER_ERROR";
    throw error;
  }

  const payload = await response.json();
  const translatedText = String(
    payload.translatedText || payload.translation || "",
  ).trim();

  if (!translatedText) {
    const error = new Error(
      "Translation provider returned no translated text.",
    );
    error.code = "PROVIDER_EMPTY";
    throw error;
  }

  return {
    translatedText,
    transliterationText: String(
      payload.transliterationText ||
        payload.transliteration ||
        payload.romanizedText ||
        "",
    ).trim(),
    detectedSourceLanguage:
      normalizeTag(payload.detectedSourceLanguage) ||
      normalizeTag(payload.detectedLanguage?.language) ||
      normalizeTag(sourceLanguage) ||
      null,
  };
}

async function translateText({
  text,
  sourceLanguage,
  requestedTargetTag,
  includeTransliteration,
  context,
}) {
  const safeText = String(text || "").trim();
  if (!safeText) {
    return {
      ok: false,
      status: 400,
      message: "text is required.",
    };
  }

  if (safeText.length > MAX_TEXT_LENGTH) {
    return {
      ok: false,
      status: 400,
      message: `text exceeds ${MAX_TEXT_LENGTH} characters.`,
    };
  }

  const normalizedSourceLanguage = normalizeTag(sourceLanguage);
  if (
    normalizedSourceLanguage &&
    normalizedSourceLanguage !== "auto" &&
    !resolveLanguageEntry(normalizedSourceLanguage)
  ) {
    return {
      ok: false,
      status: 400,
      message: "sourceLanguage is not supported in the catalog.",
    };
  }

  if (!validateRateLimit(context)) {
    return {
      ok: false,
      status: 429,
      message: "Translation rate limit exceeded. Please retry shortly.",
    };
  }

  const resolution = resolveProviderLanguage(requestedTargetTag);
  if (!resolution.ok) {
    return {
      ok: false,
      status: 400,
      message: resolution.message,
    };
  }

  cleanupCache(Date.now());
  const cacheKey = buildCacheKey({
    sourceLanguage,
    requestedTargetTag: resolution.requestedTag,
    includeTransliteration: Boolean(includeTransliteration),
    text: safeText,
  });
  const cached = translationCache.get(cacheKey);
  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
    return {
      ok: true,
      ...cached.payload,
      fromCache: true,
    };
  }

  try {
    const providerResult = await callProvider({
      text: safeText,
      sourceLanguage,
      providerTag: resolution.providerTag,
      includeTransliteration,
    });

    const payload = {
      translatedText: providerResult.translatedText,
      transliterationText: providerResult.transliterationText,
      detectedSourceLanguage: providerResult.detectedSourceLanguage,
      requestedTargetTag: resolution.requestedTag,
      requestedLanguageId: resolution.requestedLanguageId,
      providerTargetTag: resolution.providerTag,
      exactDialectSupported: resolution.exactDialectSupported,
      fallbackNotice: resolution.fallbackNotice,
    };

    translationCache.set(cacheKey, {
      createdAt: Date.now(),
      payload,
    });

    return {
      ok: true,
      ...payload,
      fromCache: false,
    };
  } catch (error) {
    const status = error.code === "PROVIDER_NOT_CONFIGURED" ? 503 : 502;
    return {
      ok: false,
      status,
      message:
        error.message ||
        "Translation provider failed and no translation could be returned.",
    };
  }
}

module.exports = {
  getSupportedTranslationLanguages,
  resolveProviderLanguage,
  translateText,
};
