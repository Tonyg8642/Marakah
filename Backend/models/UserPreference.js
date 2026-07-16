const mongoose = require("mongoose");

const { identityConfig } = require("../utils/identityValidation");

const PROFILE_SELECTION_TYPES = [
  "none",
  "singleHeritage",
  "dualHeritage",
  "support",
  "heritageAndSupport",
  "multiIdentity",
];

const PROFILE_SELECTION_IDS = identityConfig.map((entry) => entry.id);
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
    },
    selectedIdentityIds: {
      type: [String],
      default: [],
      validate: {
        validator: (value) =>
          Array.isArray(value) &&
          value.every((item) => PROFILE_SELECTION_IDS.includes(item)),
      },
    },
    customEthnicities: {
      type: [String],
      default: [],
    },
    preferNotToSay: {
      type: Boolean,
      default: false,
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

const profileImageSchema = new mongoose.Schema(
  {
    storageProvider: {
      type: String,
      default: "local-filesystem",
    },
    storagePath: {
      type: String,
      default: "",
      trim: true,
    },
    imageUrl: {
      type: String,
      default: "",
      trim: true,
    },
    fileName: {
      type: String,
      default: "",
      trim: true,
    },
    fileType: {
      type: String,
      default: "",
      trim: true,
    },
    fileSizeBytes: {
      type: Number,
      default: 0,
      min: 0,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
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
        selectionType: "multiIdentity",
        primarySelection: null,
        secondarySelection: null,
        supportSelection: null,
        selectedIdentityIds: [],
        customEthnicities: [],
        preferNotToSay: false,
        splitDirection: "vertical",
      }),
      select: false,
    },
    profileImage: {
      type: profileImageSchema,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("UserPreference", userPreferenceSchema);
