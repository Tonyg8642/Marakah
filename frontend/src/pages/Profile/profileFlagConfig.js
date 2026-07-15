export const PROFILE_IDENTITY_SELECTION_TYPES = {
  NONE: "none",
  SINGLE_HERITAGE: "singleHeritage",
  DUAL_HERITAGE: "dualHeritage",
  SUPPORT: "support",
  HERITAGE_AND_SUPPORT: "heritageAndSupport",
};

export const PROFILE_SELECTION_MODES = {
  NONE: "none",
  ONE_HERITAGE: "oneHeritage",
  TWO_HERITAGES: "twoHeritages",
  SUPPORT_FLAG: "supportFlag",
};

export const PROFILE_SPLIT_DIRECTIONS = {
  VERTICAL: "vertical",
  HORIZONTAL: "horizontal",
};

export const PALESTINIAN_SUPPORT_ID = "palestinianSupport";
export const PALESTINE_SUPPORT_SELECTION = "palestine";

export const PROFILE_FLAG_OPTIONS = [
  {
    id: "egyptian",
    displayName: "Egyptian",
    displayNameKey: "profile.identity.options.egyptian",
    type: "heritage",
    flagCode: "eg",
    assetPath: "/flags/eg.svg",
    accessibilityLabel: "Egypt flag",
    accessibilityLabelKey: "profile.identity.accessibility.egyptian",
  },
  {
    id: "somali",
    displayName: "Somali",
    displayNameKey: "profile.identity.options.somali",
    type: "heritage",
    flagCode: "so",
    assetPath: "/flags/so.svg",
    accessibilityLabel: "Somalia flag",
    accessibilityLabelKey: "profile.identity.accessibility.somali",
  },
  {
    id: "afghan",
    displayName: "Afghan",
    displayNameKey: "profile.identity.options.afghan",
    type: "heritage",
    flagCode: "af",
    assetPath: "/flags/af.svg",
    accessibilityLabel: "Afghanistan flag",
    accessibilityLabelKey: "profile.identity.accessibility.afghan",
  },
  {
    id: "iranian",
    displayName: "Iranian",
    displayNameKey: "profile.identity.options.iranian",
    type: "heritage",
    flagCode: "ir",
    assetPath: "/flags/ir.svg",
    accessibilityLabel: "Iran flag",
    accessibilityLabelKey: "profile.identity.accessibility.iranian",
  },
  {
    id: "mexican",
    displayName: "Mexican",
    displayNameKey: "profile.identity.options.mexican",
    type: "heritage",
    flagCode: "mx",
    assetPath: "/flags/mx.svg",
    accessibilityLabel: "Mexico flag",
    accessibilityLabelKey: "profile.identity.accessibility.mexican",
  },
  {
    id: "puertoRican",
    displayName: "Puerto Rican",
    displayNameKey: "profile.identity.options.puertoRican",
    type: "heritage",
    flagCode: "pr",
    assetPath: "/flags/pr.svg",
    accessibilityLabel: "Puerto Rico flag",
    accessibilityLabelKey: "profile.identity.accessibility.puertoRican",
  },
  {
    id: PALESTINIAN_SUPPORT_ID,
    displayName: "Palestinian Support",
    displayNameKey: "profile.identity.options.palestinianSupport",
    type: "support",
    flagCode: "ps",
    assetPath: "/flags/ps.svg",
    accessibilityLabel: "Palestine support flag",
    accessibilityLabelKey: "profile.identity.accessibility.palestinianSupport",
  },
];

export const PROFILE_FLAG_OPTIONS_BY_ID = Object.fromEntries(
  PROFILE_FLAG_OPTIONS.map((option) => [option.id, option]),
);

export const HERITAGE_OPTION_IDS = PROFILE_FLAG_OPTIONS.filter(
  (option) => option.type === "heritage",
).map((option) => option.id);

export const SUPPORT_OPTION_IDS = PROFILE_FLAG_OPTIONS.filter(
  (option) => option.type === "support",
).map((option) => option.id);
