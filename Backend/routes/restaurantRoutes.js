const express = require("express");
const {
  listCuisines,
  searchRestaurants,
} = require("../controllers/restaurantController");

const router = express.Router();

router.get("/cuisines", listCuisines);
router.get("/search", searchRestaurants);

module.exports = router;
