const mongoose = require("mongoose");

const masjidEventSchema = new mongoose.Schema(
  {
    placeId: { type: String, default: "" },
    city: { type: String, required: true, index: true },
    title: { type: String, required: true },
    startsAt: { type: String, required: true },
    hall: { type: String, default: "Main Hall" },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("MasjidEvent", masjidEventSchema);
