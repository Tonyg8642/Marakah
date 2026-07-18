import {
  COUNTRY_TERRITORY_IDENTITY_IDS,
  IDENTITY_CONFIG,
  IDENTITY_CONFIG_BY_ID,
  OTHER_IDENTITY_ID,
  PREFER_NOT_TO_SAY_ID,
} from "../../identity/identityConfig";

export const PROFILE_IDENTITY_SELECTION_TYPES = {
  NONE: "none",
  SINGLE_HERITAGE: "singleHeritage",
  DUAL_HERITAGE: "dualHeritage",
  SUPPORT: "support",
  HERITAGE_AND_SUPPORT: "heritageAndSupport",
  MULTI_IDENTITY: "multiIdentity",
};

export const PROFILE_SELECTION_MODES = {
  NONE: "none",
  MULTI: "multi",
};

export const PROFILE_SPLIT_DIRECTIONS = {
  VERTICAL: "vertical",
  HORIZONTAL: "horizontal",
};

function toUiOption(entry) {
  return {
    id: entry.id,
    displayName: entry.name,
    displayNameKey: `profile.identity.options.${entry.id}`,
    type: "identity",
    category: entry.category,
    visualType:
      entry.symbolType === "flag"
        ? "flag"
        : entry.symbolType === "neutral"
          ? "badge"
          : "text",
    flagCode: entry.countryCode,
    assetPath: entry.flagUrl,
    badgeText: entry.symbol,
    accessibilityLabel:
      entry.symbolType === "flag"
        ? `${entry.name} flag`
        : `${entry.name} identity badge`,
    accessibilityLabelKey: `profile.identity.accessibility.${entry.id}`,
    region: entry.region,
    country: entry.country || "",
    communityName: entry.communityName || "",
    alternateNames: entry.alternateNames || [],
    searchTerms: entry.searchTerms || [],
    supportsRestaurantFilter:
      entry.id !== OTHER_IDENTITY_ID && entry.id !== PREFER_NOT_TO_SAY_ID,
  };
}

export const IDENTITY_OPTIONS = IDENTITY_CONFIG.map(toUiOption);

export const IDENTITY_OPTIONS_BY_ID = Object.fromEntries(
  IDENTITY_OPTIONS.map((option) => [option.id, option]),
);

export const IDENTITY_OPTION_IDS = IDENTITY_OPTIONS.map((option) => option.id);

export const FLAG_BASED_IDENTITY_IDS = IDENTITY_OPTIONS.filter(
  (option) => option.visualType === "flag",
).map((option) => option.id);

export const RESTAURANT_FILTER_IDENTITY_IDS = IDENTITY_OPTIONS.filter(
  (option) => option.supportsRestaurantFilter,
).map((option) => option.id);

export const RESTAURANT_CUISINE_FILTERS = [
  {
    id: "arab-all",
    displayName: "All Arab ethnicities",
    displayNameKey: "restaurants.cuisines.arabAll",
    visualType: "badge",
    badgeText: "AR",
    accessibilityLabel: "All Arab ethnicities cuisine",
    searchQuery: "arab",
    identityIds: [
      "arab",
      "algerian",
      "bahraini",
      "egyptian",
      "emirati",
      "iraqi",
      "jordanian",
      "kuwaiti",
      "lebanese",
      "libyan",
      "mauritanian",
      "moroccan",
      "omani",
      "palestinian",
      "qatari",
      "saudi-arabian",
      "somali",
      "sudanese",
      "syrian",
      "tunisian",
      "yemeni",
      "north-african",
      "middle-eastern",
    ],
  },
  {
    id: "desi",
    displayName: "Desi",
    displayNameKey: "restaurants.cuisines.desi",
    visualType: "badge",
    badgeText: "DS",
    accessibilityLabel: "Desi cuisine",
    searchQuery: "desi",
    identityIds: [
      "south-asian",
      "pakistani",
      "indian",
      "bangladeshi",
      "afghan",
      "sri-lankan",
    ],
  },
  {
    id: "indonesian",
    displayName: "Indonesian",
    displayNameKey: "restaurants.cuisines.indonesian",
    visualType: "badge",
    badgeText: "ID",
    accessibilityLabel: "Indonesian cuisine",
    searchQuery: "indonesian",
    identityIds: ["indonesian"],
  },
  {
    id: "other-halal",
    displayName: "Other halal spots",
    displayNameKey: "restaurants.cuisines.otherHalal",
    visualType: "badge",
    badgeText: "HL",
    accessibilityLabel: "Other halal spots",
    searchQuery: "",
    identityIds: [],
  },
];

export const RESTAURANT_CUISINE_FILTERS_BY_ID = Object.fromEntries(
  RESTAURANT_CUISINE_FILTERS.map((option) => [option.id, option]),
);

export const PROFILE_FLAG_OPTIONS = IDENTITY_OPTIONS;
export const PROFILE_FLAG_OPTIONS_BY_ID = IDENTITY_OPTIONS_BY_ID;
export const HERITAGE_OPTION_IDS = IDENTITY_OPTION_IDS;
export const SUPPORT_OPTION_IDS = [];

export {
  COUNTRY_TERRITORY_IDENTITY_IDS,
  IDENTITY_CONFIG,
  IDENTITY_CONFIG_BY_ID,
  OTHER_IDENTITY_ID,
  PREFER_NOT_TO_SAY_ID,
};
