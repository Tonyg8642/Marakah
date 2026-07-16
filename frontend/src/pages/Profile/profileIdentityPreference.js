import {
  FLAG_BASED_IDENTITY_IDS,
  IDENTITY_OPTIONS_BY_ID,
  OTHER_IDENTITY_ID,
  PREFER_NOT_TO_SAY_ID,
  PROFILE_FLAG_OPTIONS_BY_ID,
  PROFILE_IDENTITY_SELECTION_TYPES,
  PROFILE_SPLIT_DIRECTIONS,
} from "./countryFlagConfig";

const ALLOWED_SELECTION_TYPES = new Set(
  Object.values(PROFILE_IDENTITY_SELECTION_TYPES),
);
const ALLOWED_SPLIT_DIRECTIONS = new Set(
  Object.values(PROFILE_SPLIT_DIRECTIONS),
);
const ALLOWED_IDENTITY_IDS = new Set(Object.keys(IDENTITY_OPTIONS_BY_ID));
const ALLOWED_FLAG_IDS = new Set(FLAG_BASED_IDENTITY_IDS);

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function getSplitDirection(value) {
  return ALLOWED_SPLIT_DIRECTIONS.has(value)
    ? value
    : PROFILE_SPLIT_DIRECTIONS.VERTICAL;
}

function normalizeIdentityIds(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const deduped = [];
  for (const id of value) {
    const normalizedId = normalizeString(id);
    if (!ALLOWED_IDENTITY_IDS.has(normalizedId)) {
      continue;
    }
    if (!deduped.includes(normalizedId)) {
      deduped.push(normalizedId);
    }
  }

  return deduped;
}

function normalizeCustomEthnicities(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const deduped = [];
  for (const item of value) {
    const cleaned = normalizeString(item).replace(/\s+/g, " ");
    if (!cleaned) {
      continue;
    }

    if (!deduped.some((existing) => existing.toLowerCase() === cleaned.toLowerCase())) {
      deduped.push(cleaned);
    }
  }

  return deduped;
}

function basePreference(splitDirection = PROFILE_SPLIT_DIRECTIONS.VERTICAL) {
  return {
    selectionType: PROFILE_IDENTITY_SELECTION_TYPES.MULTI_IDENTITY,
    selectedIdentityIds: [],
    customEthnicities: [],
    preferNotToSay: false,
    splitDirection: getSplitDirection(splitDirection),
  };
}

export function getDefaultProfileIdentityPreference() {
  return basePreference(PROFILE_SPLIT_DIRECTIONS.VERTICAL);
}

export function sanitizeProfileIdentityPreference(rawValue) {
  if (!isPlainObject(rawValue)) {
    return getDefaultProfileIdentityPreference();
  }

  const selectionType = normalizeString(rawValue.selectionType);
  const splitDirection = getSplitDirection(
    normalizeString(rawValue.splitDirection),
  );

  let selectedIdentityIds = normalizeIdentityIds(rawValue.selectedIdentityIds);
  let customEthnicities = normalizeCustomEthnicities(rawValue.customEthnicities);
  const legacyOtherText = normalizeString(rawValue.otherIdentityText);
  const preferNotToSay = Boolean(rawValue.preferNotToSay);

  if (legacyOtherText && !customEthnicities.length) {
    customEthnicities = [legacyOtherText];
  }

  if (!selectedIdentityIds.length) {
    selectedIdentityIds = normalizeIdentityIds([
      rawValue.primarySelection,
      rawValue.secondarySelection,
    ]);
  }

  if (selectionType === PROFILE_IDENTITY_SELECTION_TYPES.NONE) {
    selectedIdentityIds = [];
  }

  if (preferNotToSay || selectedIdentityIds.includes(PREFER_NOT_TO_SAY_ID)) {
    selectedIdentityIds = [PREFER_NOT_TO_SAY_ID];
    customEthnicities = [];
  }

  if (!selectedIdentityIds.includes(OTHER_IDENTITY_ID)) {
    customEthnicities = [];
  }

  return {
    selectionType: ALLOWED_SELECTION_TYPES.has(selectionType)
      ? selectionType
      : PROFILE_IDENTITY_SELECTION_TYPES.MULTI_IDENTITY,
    selectedIdentityIds,
    customEthnicities,
    preferNotToSay: selectedIdentityIds.includes(PREFER_NOT_TO_SAY_ID),
    splitDirection,
  };
}

export function getFlagLayersFromPreference(rawValue) {
  const preference = sanitizeProfileIdentityPreference(rawValue);
  const selectedOptions = preference.selectedIdentityIds
    .map((id) => PROFILE_FLAG_OPTIONS_BY_ID[id])
    .filter(Boolean);

  const flagOptions = selectedOptions.filter(
    (option) =>
      option.visualType === "flag" && typeof option.assetPath === "string",
  );

  const layers = flagOptions.slice(0, 2);
  const extraFlagCount = Math.max(0, flagOptions.length - layers.length);

  return {
    preference,
    layers,
    extraFlagCount,
    selectedOptions,
  };
}

export function getSelectionModeForPreference(rawValue) {
  const preference = sanitizeProfileIdentityPreference(rawValue);
  return preference.selectedIdentityIds.length ? "multi" : "none";
}

export function getIdentityDraftFromPreference(rawValue) {
  const preference = sanitizeProfileIdentityPreference(rawValue);

  return {
    selectedIdentityIds: [...preference.selectedIdentityIds],
    customEthnicities: [...preference.customEthnicities],
    preferNotToSay: preference.preferNotToSay,
    splitDirection: preference.splitDirection,
    searchQuery: "",
    customInput: "",
  };
}

export function getDefaultIdentityDraft() {
  return getIdentityDraftFromPreference(getDefaultProfileIdentityPreference());
}

export function validateIdentityDraft(rawDraft) {
  if (!isPlainObject(rawDraft)) {
    return "profile.identity.validation.invalidSelection";
  }

  const selectedIdentityIds = normalizeIdentityIds(rawDraft.selectedIdentityIds);
  const customEthnicities = normalizeCustomEthnicities(rawDraft.customEthnicities);
  const preferNotToSay = Boolean(rawDraft.preferNotToSay);
  const hasPreferNot = selectedIdentityIds.includes(PREFER_NOT_TO_SAY_ID);

  if ((preferNotToSay || hasPreferNot) && selectedIdentityIds.length > 1) {
    return "profile.identity.validation.invalidSelection";
  }

  if (selectedIdentityIds.includes(OTHER_IDENTITY_ID) && !customEthnicities.length) {
    return "profile.identity.validation.customRequired";
  }

  return "";
}

export function getPreferenceFromIdentityDraft(rawDraft) {
  if (!isPlainObject(rawDraft)) {
    return getDefaultProfileIdentityPreference();
  }

  let selectedIdentityIds = normalizeIdentityIds(rawDraft.selectedIdentityIds);
  let customEthnicities = normalizeCustomEthnicities(rawDraft.customEthnicities);
  const preferNotToSay = Boolean(rawDraft.preferNotToSay);
  const splitDirection = getSplitDirection(
    normalizeString(rawDraft.splitDirection),
  );

  if (preferNotToSay || selectedIdentityIds.includes(PREFER_NOT_TO_SAY_ID)) {
    selectedIdentityIds = [PREFER_NOT_TO_SAY_ID];
    customEthnicities = [];
  }

  if (!selectedIdentityIds.includes(OTHER_IDENTITY_ID)) {
    customEthnicities = [];
  }

  const flagIds = selectedIdentityIds.filter((id) => ALLOWED_FLAG_IDS.has(id));
  let selectionType = PROFILE_IDENTITY_SELECTION_TYPES.MULTI_IDENTITY;
  if (!selectedIdentityIds.length) {
    selectionType = PROFILE_IDENTITY_SELECTION_TYPES.NONE;
  } else if (flagIds.length === 1 && selectedIdentityIds.length === 1) {
    selectionType = PROFILE_IDENTITY_SELECTION_TYPES.SINGLE_HERITAGE;
  } else if (flagIds.length >= 2 && selectedIdentityIds.length <= 2) {
    selectionType = PROFILE_IDENTITY_SELECTION_TYPES.DUAL_HERITAGE;
  }

  return {
    selectionType,
    selectedIdentityIds,
    customEthnicities,
    preferNotToSay: selectedIdentityIds.includes(PREFER_NOT_TO_SAY_ID),
    splitDirection,
  };
}
