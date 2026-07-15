const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const MasjidEvent = require("../models/MasjidEvent");

const EVENTS_DB_PATH = path.join(__dirname, "..", "data", "masjidEvents.json");

function readEventsDb() {
  try {
    const raw = fs.readFileSync(EVENTS_DB_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return {
      default: [],
      cities: {},
      placeIds: {},
    };
  }
}

function normalizeCity(city = "") {
  return city.split(",")[0].trim();
}

function getEventsFromJsonFallback({ placeId, city }) {
  const db = readEventsDb();

  if (placeId && Array.isArray(db.placeIds?.[placeId])) {
    return db.placeIds[placeId];
  }

  const normalizedCity = normalizeCity(city);
  if (normalizedCity && Array.isArray(db.cities?.[normalizedCity])) {
    return db.cities[normalizedCity];
  }

  return Array.isArray(db.default) ? db.default : [];
}

async function getEventsForMasjid({ placeId, city }) {
  if (mongoose.connection.readyState === 1) {
    try {
      const normalizedCity = normalizeCity(city);
      const byPlace = placeId
        ? await MasjidEvent.find({ placeId, isActive: true })
            .select("title startsAt hall -_id")
            .lean()
        : [];

      if (byPlace.length > 0) {
        return byPlace;
      }

      const byCity = normalizedCity
        ? await MasjidEvent.find({
            city: normalizedCity,
            isActive: true,
          })
            .select("title startsAt hall -_id")
            .lean()
        : [];

      if (byCity.length > 0) {
        return byCity;
      }
    } catch {
      return getEventsFromJsonFallback({ placeId, city });
    }
  }

  return getEventsFromJsonFallback({ placeId, city });
}

module.exports = {
  getEventsForMasjid,
};
