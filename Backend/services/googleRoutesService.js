const axios = require("axios");

const GOOGLE_DIRECTIONS_URL =
  "https://maps.googleapis.com/maps/api/directions/json";
const ROUTES_CACHE_TTL_MS = 20 * 60 * 1000;
const routesCache = new Map();

function getRouteCacheKey(origin, destination) {
  return [
    Number(origin.lat).toFixed(4),
    Number(origin.lng).toFixed(4),
    Number(destination.lat).toFixed(4),
    Number(destination.lng).toFixed(4),
  ].join(":");
}

async function getDrivingInfo({ apiKey, origin, destination }) {
  if (!apiKey || !origin || !destination) {
    return null;
  }

  const cacheKey = getRouteCacheKey(origin, destination);
  const now = Date.now();
  const cached = routesCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const params = {
    key: apiKey,
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    mode: "driving",
    units: "imperial",
  };

  try {
    const response = await axios.get(GOOGLE_DIRECTIONS_URL, { params });
    const route = response.data?.routes?.[0];
    const leg = route?.legs?.[0];

    if (!leg) {
      return null;
    }

    const value = {
      drivingDistanceText: leg.distance?.text || "",
      drivingDistanceMeters: leg.distance?.value || 0,
      drivingTimeText: leg.duration?.text || "",
      drivingTimeSeconds: leg.duration?.value || 0,
    };

    routesCache.set(cacheKey, {
      value,
      expiresAt: now + ROUTES_CACHE_TTL_MS,
    });

    return value;
  } catch {
    return null;
  }
}

module.exports = {
  getDrivingInfo,
};
