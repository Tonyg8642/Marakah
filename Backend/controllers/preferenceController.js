const mongoose = require("mongoose");
const UserPreference = require("../models/UserPreference");

const SUPPORTED_LANGUAGES = new Set(["en", "ar", "fa", "ur", "so", "es"]);
const preferenceFallback = new Map();

function normalizeIdentifier(rawValue) {
  return String(rawValue || "")
    .trim()
    .toLowerCase();
}

function normalizeLanguage(rawValue) {
  const normalized = String(rawValue || "")
    .trim()
    .toLowerCase();
  return SUPPORTED_LANGUAGES.has(normalized) ? normalized : null;
}

function isMongoConnected() {
  return mongoose.connection && mongoose.connection.readyState === 1;
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
      return res.status(200).json({
        success: true,
        preferredLanguage: record?.preferredLanguage || null,
      });
    }

    return res.status(200).json({
      success: true,
      preferredLanguage: preferenceFallback.get(identifier) || null,
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
  const preferredLanguage = normalizeLanguage(req.body.preferredLanguage);

  if (!identifier) {
    return res.status(400).json({
      success: false,
      message: "identifier is required.",
    });
  }

  if (!preferredLanguage) {
    return res.status(400).json({
      success: false,
      message: "A supported preferredLanguage is required.",
    });
  }

  try {
    if (isMongoConnected()) {
      await UserPreference.findOneAndUpdate(
        { identifier },
        { preferredLanguage },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        },
      );
    } else {
      preferenceFallback.set(identifier, preferredLanguage);
    }

    return res.status(200).json({
      success: true,
      preferredLanguage,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Could not save preferred language.",
    });
  }
}

module.exports = {
  getPreferredLanguage,
  updatePreferredLanguage,
};
