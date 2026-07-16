import identityConfigData from "./identity-config.json";

export const IDENTITY_CONFIG = identityConfigData;

export const IDENTITY_CONFIG_BY_ID = Object.fromEntries(
  IDENTITY_CONFIG.map((entry) => [entry.id, entry]),
);

export const COUNTRY_TERRITORY_IDENTITY_IDS = IDENTITY_CONFIG.filter(
  (entry) => entry.symbolType === "flag",
).map((entry) => entry.id);

export const NON_FLAG_IDENTITY_IDS = IDENTITY_CONFIG.filter(
  (entry) => entry.symbolType !== "flag",
).map((entry) => entry.id);

export const OTHER_IDENTITY_ID = "other-identity";
export const PREFER_NOT_TO_SAY_ID = "prefer-not-to-say";
