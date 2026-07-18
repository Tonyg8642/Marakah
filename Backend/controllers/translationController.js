const {
  getSupportedTranslationLanguages,
  resolveProviderLanguage,
  translateText,
} = require("../services/translationService");

async function getTranslationLanguages(req, res) {
  try {
    return res.status(200).json({
      success: true,
      languages: getSupportedTranslationLanguages(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Could not load translation languages.",
    });
  }
}

async function resolveTranslationTarget(req, res) {
  const requestedTargetTag = String(req.body?.requestedTargetTag || "");
  const resolution = resolveProviderLanguage(requestedTargetTag);

  if (!resolution.ok) {
    return res.status(400).json({
      success: false,
      message: resolution.message,
    });
  }

  return res.status(200).json({
    success: true,
    requestedTag: resolution.requestedTag,
    requestedLanguageId: resolution.requestedLanguageId,
    requestedLanguageName: resolution.requestedLanguageName,
    providerTag: resolution.providerTag,
    exactDialectSupported: resolution.exactDialectSupported,
    displayNotice: resolution.fallbackNotice,
  });
}

async function translateTextController(req, res) {
  const result = await translateText({
    text: req.body?.text,
    sourceLanguage: req.body?.sourceLanguage,
    requestedTargetTag: req.body?.requestedTargetTag,
    includeTransliteration: req.body?.includeTransliteration,
    context: {
      ip: req.ip,
      identifier: req.body?.identifier,
    },
  });

  if (!result.ok) {
    return res.status(result.status || 500).json({
      success: false,
      message: result.message,
    });
  }

  return res.status(200).json({
    success: true,
    translatedText: result.translatedText,
    transliterationText: result.transliterationText,
    detectedSourceLanguage: result.detectedSourceLanguage,
    requestedTargetTag: result.requestedTargetTag,
    requestedLanguageId: result.requestedLanguageId,
    providerTargetTag: result.providerTargetTag,
    exactDialectSupported: result.exactDialectSupported,
    fallbackNotice: result.fallbackNotice,
    fromCache: result.fromCache,
  });
}

module.exports = {
  getTranslationLanguages,
  resolveTranslationTarget,
  translateTextController,
};
