const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

async function readJson(response, fallbackMessage) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || fallbackMessage);
  }
  return payload;
}

export async function fetchTranslationLanguages() {
  const response = await fetch(`${API_BASE_URL}/api/translation/languages`);
  const payload = await readJson(
    response,
    "Could not load translation language catalog.",
  );
  return Array.isArray(payload.languages) ? payload.languages : [];
}

export async function resolveTranslationTarget(requestedTargetTag) {
  const response = await fetch(`${API_BASE_URL}/api/translation/resolve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ requestedTargetTag }),
  });

  return readJson(response, "Could not resolve translation language target.");
}

export async function translateText({
  text,
  sourceLanguage,
  requestedTargetTag,
  identifier,
  includeTransliteration,
}) {
  const response = await fetch(`${API_BASE_URL}/api/translation/translate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      sourceLanguage,
      requestedTargetTag,
      identifier,
      includeTransliteration: Boolean(includeTransliteration),
    }),
  });

  return readJson(response, "Translation request failed.");
}
