import {
  HERITAGE_OPTION_IDS,
  PALESTINE_SUPPORT_SELECTION,
  PALESTINIAN_SUPPORT_ID,
  PROFILE_FLAG_OPTIONS_BY_ID,
  PROFILE_IDENTITY_SELECTION_TYPES,
  PROFILE_SELECTION_MODES,
  PROFILE_SPLIT_DIRECTIONS,
  SUPPORT_OPTION_IDS,
} from "./profileFlagConfig";

const ALLOWED_SELECTION_TYPES = new Set(
  Object.values(PROFILE_IDENTITY_SELECTION_TYPES),
);
const ALLOWED_SPLIT_DIRECTIONS = new Set(
  Object.values(PROFILE_SPLIT_DIRECTIONS),
);
const ALLOWED_HERITAGE_IDS = new Set(HERITAGE_OPTION_IDS);
const ALLOWED_SUPPORT_IDS = new Set(SUPPORT_OPTION_IDS);

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

function getHeritageId(value) {
  return ALLOWED_HERITAGE_IDS.has(value) ? value : null;
}

function getSupportId(value) {
  return ALLOWED_SUPPORT_IDS.has(value) ? value : null;
}

function basePreference(splitDirection = PROFILE_SPLIT_DIRECTIONS.VERTICAL) {
  return {
    selectionType: PROFILE_IDENTITY_SELECTION_TYPES.NONE,
    primarySelection: null,
    secondarySelection: null,
    supportSelection: null,
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
  const primarySelection = normalizeString(rawValue.primarySelection);
  const secondarySelection = normalizeString(rawValue.secondarySelection);
  const supportSelection = normalizeString(rawValue.supportSelection);
  const splitDirection = getSplitDirection(
    normalizeString(rawValue.splitDirection),
  );

  if (!ALLOWED_SELECTION_TYPES.has(selectionType)) {
    return basePreference(splitDirection);
  }

  if (selectionType === PROFILE_IDENTITY_SELECTION_TYPES.NONE) {
    return basePreference(splitDirection);
  }

  if (selectionType === PROFILE_IDENTITY_SELECTION_TYPES.SINGLE_HERITAGE) {
    const primaryHeritage = getHeritageId(primarySelection);
    if (!primaryHeritage) {
      return basePreference(splitDirection);
    }

    return {
      selectionType,
      primarySelection: primaryHeritage,
      secondarySelection: null,
      supportSelection: null,
      splitDirection,
    };
  }

  if (selectionType === PROFILE_IDENTITY_SELECTION_TYPES.DUAL_HERITAGE) {
    const firstHeritage = getHeritageId(primarySelection);
    const secondHeritage = getHeritageId(secondarySelection);
    if (!firstHeritage || !secondHeritage || firstHeritage === secondHeritage) {
      return basePreference(splitDirection);
    }

    return {
      selectionType,
      primarySelection: firstHeritage,
      secondarySelection: secondHeritage,
      supportSelection: null,
      splitDirection,
    };
  }

  if (selectionType === PROFILE_IDENTITY_SELECTION_TYPES.SUPPORT) {
    const supportId = getSupportId(primarySelection) || PALESTINIAN_SUPPORT_ID;

    if (supportId !== PALESTINIAN_SUPPORT_ID) {
      return basePreference(splitDirection);
    }

    return {
      selectionType,
      primarySelection: supportId,
      secondarySelection: null,
      supportSelection: PALESTINE_SUPPORT_SELECTION,
      splitDirection,
    };
  }

  if (selectionType === PROFILE_IDENTITY_SELECTION_TYPES.HERITAGE_AND_SUPPORT) {
    const firstValue =
      getHeritageId(primarySelection) || getSupportId(primarySelection);
    const secondValue =
      getHeritageId(secondarySelection) || getSupportId(secondarySelection);

    if (!firstValue || !secondValue || firstValue === secondValue) {
      return basePreference(splitDirection);
    }

    const pair = new Set([firstValue, secondValue]);
    if (!pair.has(PALESTINIAN_SUPPORT_ID)) {
      return basePreference(splitDirection);
    }

    const heritageId =
      firstValue === PALESTINIAN_SUPPORT_ID ? secondValue : firstValue;
    if (!ALLOWED_HERITAGE_IDS.has(heritageId)) {
      return basePreference(splitDirection);
    }

    return {
      selectionType,
      primarySelection: firstValue,
      secondarySelection: secondValue,
      supportSelection:
        supportSelection === PALESTINE_SUPPORT_SELECTION
          ? supportSelection
          : PALESTINE_SUPPORT_SELECTION,
      splitDirection,
    };
  }

  return basePreference(splitDirection);
}

export function getFlagLayersFromPreference(rawValue) {
  const preference = sanitizeProfileIdentityPreference(rawValue);
  const layers = [];

  if (preference.primarySelection) {
    const option = PROFILE_FLAG_OPTIONS_BY_ID[preference.primarySelection];
    if (option) {
      layers.push(option);
    }
  }

  if (preference.secondarySelection && layers.length < 2) {
    const option = PROFILE_FLAG_OPTIONS_BY_ID[preference.secondarySelection];
    if (option) {
      layers.push(option);
    }
  }

  return {
    preference,
    layers,
  };
}

export function getSelectionModeForPreference(rawValue) {
  const preference = sanitizeProfileIdentityPreference(rawValue);

  if (preference.selectionType === PROFILE_IDENTITY_SELECTION_TYPES.NONE) {
    return PROFILE_SELECTION_MODES.NONE;
  }

  if (
    preference.selectionType ===
    PROFILE_IDENTITY_SELECTION_TYPES.SINGLE_HERITAGE
  ) {
    return PROFILE_SELECTION_MODES.ONE_HERITAGE;
  }

  if (
    preference.selectionType === PROFILE_IDENTITY_SELECTION_TYPES.DUAL_HERITAGE
  ) {
    return PROFILE_SELECTION_MODES.TWO_HERITAGES;
  }

  if (preference.selectionType === PROFILE_IDENTITY_SELECTION_TYPES.SUPPORT) {
    return PROFILE_SELECTION_MODES.SUPPORT_FLAG;
  }

  return PROFILE_SELECTION_MODES.ONE_HERITAGE;
}

export function getIdentityDraftFromPreference(rawValue) {
  const preference = sanitizeProfileIdentityPreference(rawValue);
  const selectionMode = getSelectionModeForPreference(preference);

  const draft = {
    selectionMode,
    primarySelection: "",
    secondarySelection: "",
    includePalestinianSupport: false,
    supportOnLeft: false,
    splitDirection: preference.splitDirection,
  };

  if (selectionMode === PROFILE_SELECTION_MODES.ONE_HERITAGE) {
    if (
      preference.selectionType ===
      PROFILE_IDENTITY_SELECTION_TYPES.HERITAGE_AND_SUPPORT
    ) {
      const supportOnLeft =
        preference.primarySelection === PALESTINIAN_SUPPORT_ID;
      draft.includePalestinianSupport = true;
      draft.supportOnLeft = supportOnLeft;
      draft.primarySelection = supportOnLeft
        ? String(preference.secondarySelection || "")
        : String(preference.primarySelection || "");
      return draft;
    }

    draft.primarySelection = String(preference.primarySelection || "");
    return draft;
  }

  if (selectionMode === PROFILE_SELECTION_MODES.TWO_HERITAGES) {
    draft.primarySelection = String(preference.primarySelection || "");
    draft.secondarySelection = String(preference.secondarySelection || "");
    return draft;
  }

  if (selectionMode === PROFILE_SELECTION_MODES.SUPPORT_FLAG) {
    draft.primarySelection = PALESTINIAN_SUPPORT_ID;
    return draft;
  }

  return draft;
}

export function getDefaultIdentityDraft() {
  return getIdentityDraftFromPreference(getDefaultProfileIdentityPreference());
}

export function validateIdentityDraft(rawDraft) {
  if (!isPlainObject(rawDraft)) {
    return "profile.identity.validation.invalidSelection";
  }

  const selectionMode = normalizeString(rawDraft.selectionMode);
  const primary = normalizeString(rawDraft.primarySelection);
  const secondary = normalizeString(rawDraft.secondarySelection);
  const includePalestinianSupport = Boolean(rawDraft.includePalestinianSupport);

  if (selectionMode === PROFILE_SELECTION_MODES.NONE) {
    return "";
  }

  if (selectionMode === PROFILE_SELECTION_MODES.SUPPORT_FLAG) {
    return "";
  }

  if (selectionMode === PROFILE_SELECTION_MODES.ONE_HERITAGE) {
    if (!getHeritageId(primary)) {
      return "profile.identity.validation.primaryRequired";
    }

    if (
      includePalestinianSupport &&
      secondary &&
      secondary !== PALESTINIAN_SUPPORT_ID
    ) {
      return "profile.identity.validation.invalidSelection";
    }

    return "";
  }

  if (selectionMode === PROFILE_SELECTION_MODES.TWO_HERITAGES) {
    const firstHeritage = getHeritageId(primary);
    const secondHeritage = getHeritageId(secondary);

    if (!firstHeritage) {
      return "profile.identity.validation.primaryRequired";
    }

    if (!secondHeritage) {
      return "profile.identity.validation.secondaryRequired";
    }

    if (firstHeritage === secondHeritage) {
      return "profile.identity.validation.mustDiffer";
    }

    return "";
  }

  return "profile.identity.validation.invalidSelection";
}

export function getPreferenceFromIdentityDraft(rawDraft) {
  if (!isPlainObject(rawDraft)) {
    return getDefaultProfileIdentityPreference();
  }

  const selectionMode = normalizeString(rawDraft.selectionMode);
  const primary = normalizeString(rawDraft.primarySelection);
  const secondary = normalizeString(rawDraft.secondarySelection);
  const includePalestinianSupport = Boolean(rawDraft.includePalestinianSupport);
  const supportOnLeft = Boolean(rawDraft.supportOnLeft);
  const splitDirection = getSplitDirection(
    normalizeString(rawDraft.splitDirection),
  );

  if (selectionMode === PROFILE_SELECTION_MODES.NONE) {
    return basePreference(splitDirection);
  }

  if (selectionMode === PROFILE_SELECTION_MODES.SUPPORT_FLAG) {
    return {
      selectionType: PROFILE_IDENTITY_SELECTION_TYPES.SUPPORT,
      primarySelection: PALESTINIAN_SUPPORT_ID,
      secondarySelection: null,
      supportSelection: PALESTINE_SUPPORT_SELECTION,
      splitDirection,
    };
  }

  if (selectionMode === PROFILE_SELECTION_MODES.ONE_HERITAGE) {
    const primaryHeritage = getHeritageId(primary);
    if (!primaryHeritage) {
      return basePreference(splitDirection);
    }

    if (!includePalestinianSupport) {
      return {
        selectionType: PROFILE_IDENTITY_SELECTION_TYPES.SINGLE_HERITAGE,
        primarySelection: primaryHeritage,
        secondarySelection: null,
        supportSelection: null,
        splitDirection,
      };
    }

    return {
      selectionType: PROFILE_IDENTITY_SELECTION_TYPES.HERITAGE_AND_SUPPORT,
      primarySelection: supportOnLeft
        ? PALESTINIAN_SUPPORT_ID
        : primaryHeritage,
      secondarySelection: supportOnLeft
        ? primaryHeritage
        : PALESTINIAN_SUPPORT_ID,
      supportSelection: PALESTINE_SUPPORT_SELECTION,
      splitDirection,
    };
  }

  if (selectionMode === PROFILE_SELECTION_MODES.TWO_HERITAGES) {
    const firstHeritage = getHeritageId(primary);
    const secondHeritage = getHeritageId(secondary);

    if (!firstHeritage || !secondHeritage || firstHeritage === secondHeritage) {
      return basePreference(splitDirection);
    }

    return {
      selectionType: PROFILE_IDENTITY_SELECTION_TYPES.DUAL_HERITAGE,
      primarySelection: firstHeritage,
      secondarySelection: secondHeritage,
      supportSelection: null,
      splitDirection,
    };
  }

  return basePreference(splitDirection);
}
