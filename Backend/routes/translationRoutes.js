const express = require("express");
const {
  getTranslationLanguages,
  resolveTranslationTarget,
  translateTextController,
} = require("../controllers/translationController");

const router = express.Router();

router.get("/languages", getTranslationLanguages);
router.post("/resolve", resolveTranslationTarget);
router.post("/translate", translateTextController);
router.post("/", translateTextController);

module.exports = router;
