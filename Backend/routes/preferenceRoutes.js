const express = require("express");
const { requireProfileImageAuth } = require("../middleware/profileImageAuth");
const {
  deleteProfileImage,
  getLanguageCatalogController,
  getIdentityPreference,
  getProfileImage,
  getPreferredLanguage,
  uploadMiddleware,
  updateIdentityPreference,
  updatePreferredLanguage,
  uploadProfileImage,
} = require("../controllers/preferenceController");

const router = express.Router();

router.get("/language", getPreferredLanguage);
router.put("/language", updatePreferredLanguage);
router.get("/languages", getLanguageCatalogController);
router.get("/identity", getIdentityPreference);
router.put("/identity", updateIdentityPreference);
router.get("/profile-image", requireProfileImageAuth, getProfileImage);
router.post(
  "/profile-image",
  requireProfileImageAuth,
  uploadMiddleware,
  uploadProfileImage,
);
router.delete("/profile-image", requireProfileImageAuth, deleteProfileImage);

module.exports = router;
