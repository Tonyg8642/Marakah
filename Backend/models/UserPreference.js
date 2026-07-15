const mongoose = require("mongoose");

const PROFILE_SELECTION_TYPES = [
  "none",
  "singleHeritage",
  "dualHeritage",
  "support",
  "heritageAndSupport",
];

const PROFILE_SELECTION_IDS = [
  "egyptian",
  "somali",
  "afghan",
  "iranian",
  "mexican",
  "puertoRican",
  "palestinianSupport",
];

const PROFILE_SUPPORT_SELECTIONS = ["palestine"];
const PROFILE_SPLIT_DIRECTIONS = ["vertical", "horizontal"];

const profileIdentityPreferenceSchema = new mongoose.Schema(
  {
    selectionType: {
      type: String,
      enum: PROFILE_SELECTION_TYPES,
      default: "none",
    },
    primarySelection: {
      type: String,
      default: null,
      validate: {
        validator: (value) =>
          value === null || PROFILE_SELECTION_IDS.includes(value),
      },
    },
    secondarySelection: {
      type: String,
      default: null,
      validate: {
        validator: (value) =>
          value === null || PROFILE_SELECTION_IDS.includes(value),
      },
    },
    supportSelection: {
      type: String,
      default: null,
      validate: {
        validator: (value) =>
          value === null || PROFILE_SUPPORT_SELECTIONS.includes(value),
      },
    },
    splitDirection: {
      type: String,
      enum: PROFILE_SPLIT_DIRECTIONS,
      default: "vertical",
    },
  },
  {
    _id: false,
  },
);

const userPreferenceSchema = new mongoose.Schema(
  {
    identifier: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    preferredLanguage: {
      type: String,
      required: true,
      enum: ["en", "ar", "fa", "ur", "so", "es"],
      default: "en",
    },
    profileIdentityPreference: {
      type: profileIdentityPreferenceSchema,
      default: () => ({
        selectionType: "none",
        primarySelection: null,
        secondarySelection: null,
        supportSelection: null,
        splitDirection: "vertical",
      }),
      select: false,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("UserPreference", userPreferenceSchema);
