const express = require("express");
const {
  getPreferredLanguage,
  updatePreferredLanguage,
} = require("../controllers/preferenceController");

const router = express.Router();

router.get("/language", getPreferredLanguage);
router.put("/language", updatePreferredLanguage);

module.exports = router;
