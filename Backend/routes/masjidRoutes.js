const express = require("express");
const {
  proxyMasjidPhoto,
  searchMasjids,
} = require("../controllers/masjidController");

const router = express.Router();

router.get("/search", searchMasjids);
router.get("/photo", proxyMasjidPhoto);

module.exports = router;
