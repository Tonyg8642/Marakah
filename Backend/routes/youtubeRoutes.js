const express = require("express");
const {
  getSisterBadiaPlaylistController,
} = require("../controllers/youtubeController");

const router = express.Router();

router.get("/sister-badia-playlist", getSisterBadiaPlaylistController);

module.exports = router;
