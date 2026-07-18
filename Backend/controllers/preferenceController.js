const mongoose = require("mongoose");
const path = require("node:path");
const multer = require("multer");
const UserPreference = require("../models/UserPreference");
const {
  createProfileImageStorageService,
  getImageExtension,
} = require("../services/profileImageStorageService");
const {
  sanitizeIdentityPreference,
  validateIdentityPreference,
} = require("../utils/identityValidation");
const {
  getLanguageCatalog,
  resolvePreferredLanguage,
} = require("../services/languageCatalogService");

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IMAGE_BYTES,
    files: 1,
  },
}).single("profileImage");
const preferenceFallback = new Map();
const preferenceIdFallback = new Map();
const identityFallback = new Map();
const profileImageFallback = new Map();
const profileImageStorage = createProfileImageStorageService({
  backendRoot:
    process.env.PROFILE_IMAGE_BACKEND_ROOT || path.join(__dirname, ".."),
  uploadRoot: process.env.PROFILE_IMAGE_UPLOAD_ROOT,
  publicPrefix: process.env.PROFILE_IMAGE_PUBLIC_PREFIX,
});

function normalizeIdentifier(rawValue) {
  return String(rawValue || "")
    .trim()
    .toLowerCase();
}

function normalizeLanguage(rawValue) {
  return resolvePreferredLanguage(rawValue);
}

function isMongoConnected() {
  return mongoose.connection && mongoose.connection.readyState === 1;
}

function normalizeStoredImage(record) {
  if (!record || typeof record !== "object") {
    return null;
  }

  const imageUrl = String(record.imageUrl || "").trim();
  const storagePath = String(record.storagePath || "").trim();
  const fileType = String(record.fileType || "").trim();
  if (!imageUrl || !storagePath || !fileType) {
    return null;
  }

  return {
    storageProvider: String(record.storageProvider || "local-filesystem"),
    storagePath,
    imageUrl,
    fileName: String(record.fileName || "").trim(),
    fileType,
    fileSizeBytes: Number(record.fileSizeBytes) || 0,
    updatedAt: record.updatedAt || new Date().toISOString(),
  };
}

function normalizeLegacyIdentity(preference = {}) {
  if (Array.isArray(preference.selectedIdentityIds)) {
    return sanitizeIdentityPreference({
      ethnicityIds: preference.selectedIdentityIds,
      customEthnicities: preference.customEthnicities,
      preferNotToSay: preference.preferNotToSay,
    });
  }

  return sanitizeIdentityPreference({
    ethnicityIds: [preference.primarySelection, preference.secondarySelection],
    customEthnicities:
      typeof preference.otherIdentityText === "string" &&
      preference.otherIdentityText.trim()
        ? [preference.otherIdentityText.trim()]
        : [],
    preferNotToSay: false,
  });
}

function ensureAuthorizedIdentifier(req, identifier) {
  const authenticatedIdentifier = normalizeIdentifier(
    req.authenticatedIdentifier,
  );
  const normalizedIdentifier = normalizeIdentifier(identifier);

  if (
    authenticatedIdentifier &&
    normalizedIdentifier &&
    authenticatedIdentifier !== normalizedIdentifier
  ) {
    return false;
  }

  return true;
}

async function getPreferredLanguage(req, res) {
  const identifier = normalizeIdentifier(req.query.identifier);
  if (!identifier) {
    return res.status(400).json({
      success: false,
      message: "identifier is required.",
    });
  }

  try {
    if (isMongoConnected()) {
      const record = await UserPreference.findOne({ identifier }).lean();
      const resolved = resolvePreferredLanguage(record?.preferredLanguage);
      const preferredLanguageId =
        record?.preferredLanguageId || resolved?.id || null;
      return res.status(200).json({
        success: true,
        preferredLanguage: record?.preferredLanguage || null,
        preferredLanguageTag: record?.preferredLanguage || null,
        preferredLanguageId,
      });
    }

    return res.status(200).json({
      success: true,
      preferredLanguage: preferenceFallback.get(identifier) || null,
      preferredLanguageTag: preferenceFallback.get(identifier) || null,
      preferredLanguageId: preferenceIdFallback.get(identifier) || null,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Could not load preferred language.",
    });
  }
}

async function updatePreferredLanguage(req, res) {
  const identifier = normalizeIdentifier(req.body.identifier);
  const preferredLanguageSelection = normalizeLanguage(
    req.body.preferredLanguage || req.body.preferredLanguageTag,
  );

  if (!identifier) {
    return res.status(400).json({
      success: false,
      message: "identifier is required.",
    });
  }

  if (!preferredLanguageSelection) {
    return res.status(400).json({
      success: false,
      message: "A supported preferredLanguage is required.",
    });
  }

  const preferredLanguage = preferredLanguageSelection.tag;
  const preferredLanguageId = preferredLanguageSelection.id;

  try {
    if (isMongoConnected()) {
      await UserPreference.findOneAndUpdate(
        { identifier },
        { preferredLanguage, preferredLanguageId },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        },
      );
    } else {
      preferenceFallback.set(identifier, preferredLanguage);
      preferenceIdFallback.set(identifier, preferredLanguageId);
    }

    return res.status(200).json({
      success: true,
      preferredLanguage,
      preferredLanguageTag: preferredLanguage,
      preferredLanguageId,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Could not save preferred language.",
    });
  }
}

async function getLanguageCatalogController(req, res) {
  try {
    return res.status(200).json({
      success: true,
      languages: getLanguageCatalog(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Could not load language catalog.",
    });
  }
}

async function getIdentityPreference(req, res) {
  const identifier = normalizeIdentifier(req.query.identifier);
  if (!identifier) {
    return res.status(400).json({
      success: false,
      message: "identifier is required.",
    });
  }

  try {
    if (isMongoConnected()) {
      const record = await UserPreference.findOne({ identifier }).lean();
      const normalized = normalizeLegacyIdentity(
        record?.profileIdentityPreference || {},
      );
      return res.status(200).json({
        success: true,
        identityPreference: normalized,
      });
    }

    return res.status(200).json({
      success: true,
      identityPreference:
        identityFallback.get(identifier) || sanitizeIdentityPreference({}),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Could not load identity preference.",
    });
  }
}

async function updateIdentityPreference(req, res) {
  const identifier = normalizeIdentifier(req.body.identifier);

  if (!identifier) {
    return res.status(400).json({
      success: false,
      message: "identifier is required.",
    });
  }

  const validation = validateIdentityPreference(req.body.identityPreference);
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      message: validation.message,
    });
  }

  const normalized = validation.value;

  try {
    if (isMongoConnected()) {
      await UserPreference.findOneAndUpdate(
        { identifier },
        {
          profileIdentityPreference: {
            selectionType: normalized.ethnicityIds.length
              ? "multiIdentity"
              : "none",
            primarySelection: normalized.ethnicityIds[0] || null,
            secondarySelection: normalized.ethnicityIds[1] || null,
            supportSelection: null,
            selectedIdentityIds: normalized.ethnicityIds,
            customEthnicities: normalized.customEthnicities,
            preferNotToSay: normalized.preferNotToSay,
            splitDirection: "vertical",
          },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        },
      );
    } else {
      identityFallback.set(identifier, normalized);
    }

    return res.status(200).json({
      success: true,
      identityPreference: normalized,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Could not save identity preference.",
    });
  }
}

async function getProfileImage(req, res) {
  const identifier = normalizeIdentifier(req.query.identifier);
  if (!identifier) {
    return res.status(400).json({
      success: false,
      message: "identifier is required.",
    });
  }

  if (!ensureAuthorizedIdentifier(req, identifier)) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to modify this profile image.",
    });
  }

  try {
    if (isMongoConnected()) {
      const record = await UserPreference.findOne({ identifier }).lean();
      return res.status(200).json({
        success: true,
        profileImage: normalizeStoredImage(record?.profileImage),
      });
    }

    return res.status(200).json({
      success: true,
      profileImage: normalizeStoredImage(profileImageFallback.get(identifier)),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Could not load profile image.",
    });
  }
}

async function uploadProfileImage(req, res) {
  const identifier = normalizeIdentifier(req.body.identifier);
  if (!identifier) {
    return res.status(400).json({
      success: false,
      message: "identifier is required.",
    });
  }

  if (!ensureAuthorizedIdentifier(req, identifier)) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to modify this profile image.",
    });
  }

  const file = req.file;
  if (!file) {
    return res.status(400).json({
      success: false,
      message: "profileImage file is required.",
    });
  }

  if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
    return res.status(400).json({
      success: false,
      message: "Only JPEG, PNG, and WebP images are supported.",
    });
  }

  if (
    !Number.isFinite(file.size) ||
    file.size <= 0 ||
    file.size > MAX_IMAGE_BYTES
  ) {
    return res.status(400).json({
      success: false,
      message: "Image must be smaller than 5 MB.",
    });
  }

  const extension = getImageExtension(file.mimetype);
  if (!extension) {
    return res.status(400).json({
      success: false,
      message: "Unsupported image format.",
    });
  }

  try {
    const storedImage = await profileImageStorage.uploadProfileImage({
      identifier,
      fileBuffer: file.buffer,
      fileType: file.mimetype,
      originalFileName: file.originalname,
    });

    const profileImage = {
      storageProvider: storedImage.storageProvider,
      storagePath: storedImage.storagePath,
      imageUrl:
        profileImageStorage.getProfileImageUrl(storedImage.storagePath) ||
        storedImage.imageUrl,
      fileName: storedImage.fileName,
      fileType: file.mimetype,
      fileSizeBytes: file.size,
      updatedAt: new Date().toISOString(),
    };

    if (isMongoConnected()) {
      const existing = await UserPreference.findOne({ identifier }).lean();
      await UserPreference.findOneAndUpdate(
        { identifier },
        { profileImage },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        },
      );

      const previousPath = existing?.profileImage?.storagePath;
      if (previousPath && previousPath !== profileImage.storagePath) {
        await profileImageStorage.deleteProfileImage(previousPath);
      }
    } else {
      const existing = profileImageFallback.get(identifier);
      profileImageFallback.set(identifier, profileImage);
      const previousPath = existing?.storagePath;
      if (previousPath && previousPath !== profileImage.storagePath) {
        await profileImageStorage.deleteProfileImage(previousPath);
      }
    }

    return res.status(200).json({
      success: true,
      profileImage,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Could not upload profile image.",
    });
  }
}

async function deleteProfileImage(req, res) {
  const identifier = normalizeIdentifier(
    req.body.identifier || req.query.identifier,
  );
  if (!identifier) {
    return res.status(400).json({
      success: false,
      message: "identifier is required.",
    });
  }

  if (!ensureAuthorizedIdentifier(req, identifier)) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to modify this profile image.",
    });
  }

  try {
    let existingImage = null;

    if (isMongoConnected()) {
      const existing = await UserPreference.findOne({ identifier }).lean();
      existingImage = existing?.profileImage || null;
      await UserPreference.findOneAndUpdate(
        { identifier },
        { profileImage: null },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        },
      );
    } else {
      existingImage = profileImageFallback.get(identifier) || null;
      profileImageFallback.delete(identifier);
    }

    if (existingImage?.storagePath) {
      await profileImageStorage.deleteProfileImage(existingImage.storagePath);
    }

    return res.status(200).json({
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Could not remove profile image.",
    });
  }
}

module.exports = {
  deleteProfileImage,
  getLanguageCatalogController,
  getPreferredLanguage,
  updatePreferredLanguage,
  getIdentityPreference,
  updateIdentityPreference,
  getProfileImage,
  uploadMiddleware,
  uploadProfileImage,
};
