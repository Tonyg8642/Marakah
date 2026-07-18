import { IDENTITY_CONFIG } from "../identity/identityConfig";

function normalizeIdentityValue(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/[\s_-]+/g, " ")
    .trim();
}

function addFlagLookupValue(lookup, value, flagUrl) {
  const normalized = normalizeIdentityValue(value);
  if (!normalized || lookup.has(normalized)) {
    return;
  }

  lookup.set(normalized, flagUrl);
}

const FLAG_LOOKUP = (() => {
  const lookup = new Map();

  for (const entry of IDENTITY_CONFIG) {
    const flagUrl = String(entry?.flagUrl || "").trim();
    if (!flagUrl) {
      continue;
    }

    addFlagLookupValue(lookup, entry.id, flagUrl);
    addFlagLookupValue(lookup, entry.name, flagUrl);
    addFlagLookupValue(lookup, entry.country, flagUrl);
    addFlagLookupValue(lookup, entry.communityName, flagUrl);
    addFlagLookupValue(lookup, entry.countryCode, flagUrl);

    for (const alternateName of entry.alternateNames || []) {
      addFlagLookupValue(lookup, alternateName, flagUrl);
    }

    for (const searchTerm of entry.searchTerms || []) {
      addFlagLookupValue(lookup, searchTerm, flagUrl);
    }
  }

  return lookup;
})();

function resolveIdentityFlag(value) {
  const normalized = normalizeIdentityValue(value);
  if (!normalized) {
    return null;
  }

  return FLAG_LOOKUP.get(normalized) || null;
}

export function getUserFlag({ flagUrl, country, ethnicity } = {}) {
  const explicitFlag = String(flagUrl || "").trim();
  if (explicitFlag) {
    return explicitFlag;
  }

  const countryFlag = resolveIdentityFlag(country);
  if (countryFlag) {
    return countryFlag;
  }

  return resolveIdentityFlag(ethnicity);
}

export function __internalNormalizeIdentityValue(value) {
  return normalizeIdentityValue(value);
}
