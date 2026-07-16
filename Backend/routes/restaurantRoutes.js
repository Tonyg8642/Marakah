const express = require("express");
const { searchRestaurants } = require("../controllers/restaurantController");

const router = express.Router();

router.get("/search", searchRestaurants);

module.exports = router;
