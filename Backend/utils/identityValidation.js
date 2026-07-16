const path = require("path");

// Shared single source with frontend.
const identityConfig = require(path.resolve(
  __dirname,
  "../../frontend/src/identity/identity-config.json",
));

const OTHER_IDENTITY_ID = "other-identity";
const PREFER_NOT_TO_SAY_ID = "prefer-not-to-say";
const ALLOWED_IDS = new Set(identityConfig.map((entry) => entry.id));

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeIds(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const ids = [];
  for (const raw of value) {
    const id = normalizeString(raw);
    if (!ALLOWED_IDS.has(id) || ids.includes(id)) {
      continue;
    }
    ids.push(id);
  }
  return ids;
}

function normalizeCustom(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const list = [];
  for (const raw of value) {
    const cleaned = normalizeString(raw).replace(/\s+/g, " ");
    if (!cleaned) {
      continue;
    }
    if (!list.some((item) => item.toLowerCase() === cleaned.toLowerCase())) {
      list.push(cleaned);
    }
  }
  return list;
}

function sanitizeIdentityPreference(rawValue) {
  const raw = rawValue && typeof rawValue === "object" ? rawValue : {};
  let ethnicityIds = normalizeIds(raw.ethnicityIds);
  let customEthnicities = normalizeCustom(raw.customEthnicities);

  if (raw.preferNotToSay || ethnicityIds.includes(PREFER_NOT_TO_SAY_ID)) {
    ethnicityIds = [PREFER_NOT_TO_SAY_ID];
    customEthnicities = [];
  }

  if (!ethnicityIds.includes(OTHER_IDENTITY_ID)) {
    customEthnicities = [];
  }

  return {
    ethnicityIds,
    customEthnicities,
    preferNotToSay: ethnicityIds.includes(PREFER_NOT_TO_SAY_ID),
  };
}

function validateIdentityPreference(rawValue) {
  const safeValue = sanitizeIdentityPreference(rawValue);

  if (
    safeValue.ethnicityIds.includes(OTHER_IDENTITY_ID) &&
    safeValue.customEthnicities.length === 0
  ) {
    return {
      valid: false,
      message: "Provide at least one custom identity for Other identity.",
      value: safeValue,
    };
  }

  return {
    valid: true,
    message: "",
    value: safeValue,
  };
}

module.exports = {
  identityConfig,
  sanitizeIdentityPreference,
  validateIdentityPreference,
};
