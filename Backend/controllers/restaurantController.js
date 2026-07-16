const {
  fetchPlaceDetailsById,
  searchHalalRestaurantsFromGoogle,
} = require("../services/googlePlacesService");
const { getDrivingInfo } = require("../services/googleRoutesService");

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDistanceFilter(rawValue) {
  const normalized = String(rawValue || "")
    .trim()
    .toLowerCase();

  if (normalized === "nationwide" || normalized === "all") {
    return null;
  }

  const parsed = toNumber(rawValue);
  if (parsed !== null && parsed > 0) {
    return parsed;
  }

  return 25;
}

function parseLanguage(rawValue) {
  const normalized = String(rawValue || "")
    .trim()
    .toLowerCase();
  if (["en", "ar", "fa", "ur", "so", "es"].includes(normalized)) {
    return normalized;
  }

  return "en";
}

function parseEthnicity(rawValue) {
  const value = String(rawValue || "").trim();
  if (!value) {
    return "";
  }

  const supported = new Set([
    "Egyptian",
    "Somali",
    "Desi",
    "Persian",
    "Sudanese",
    "Palestinian",
    "Lebanese",
    "Syrian",
    "Jordanian",
    "Saudi",
    "Emirati",
    "Kuwaiti",
    "Qatari",
    "Bahraini",
    "Omani",
    "Moroccan",
    "Algerian",
    "Tunisian",
    "Libyan",
    "Yemeni",
    "Iraqi",
  ]);

  return supported.has(value) ? value : "";
}

function haversineMiles(from, to) {
  const earthRadiusMiles = 3958.8;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMiles * c;
}

function inferHalalSign(restaurant) {
  const text =
    `${restaurant.name || ""} ${restaurant.address || ""}`.toLowerCase();

  if (text.includes("zabiha") || text.includes("zabah")) {
    return "zabiha";
  }

  return "halal";
}

function toUrlOrNull(value) {
  const raw = String(value || "").trim();
  return /^https?:\/\//i.test(raw) ? raw : null;
}

async function searchRestaurants(req, res) {
  const city = (req.query.city || "").trim();
  const query = (req.query.query || "").trim();
  const ethnicity = parseEthnicity(req.query.ethnicity);
  const effectiveQuery = ethnicity ? `halal ${ethnicity} restaurant` : query;
  const userLat = toNumber(req.query.userLat);
  const userLng = toNumber(req.query.userLng);
  const maxDistanceMiles = parseDistanceFilter(req.query.maxDistanceMiles);
  const language = parseLanguage(req.query.language);
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(Math.max(1, Number(req.query.pageSize) || 8), 16);

  if (!city && (userLat === null || userLng === null)) {
    return res.status(400).json({
      success: false,
      message: "Provide city or current location coordinates.",
    });
  }

  const userLocation =
    userLat !== null && userLng !== null
      ? { lat: userLat, lng: userLng }
      : null;

  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    const restaurants = await searchHalalRestaurantsFromGoogle({
      apiKey,
      city,
      query: effectiveQuery,
      userLocation,
      limit: 24,
      languageCode: language,
    });

    const enrichedRestaurants = await Promise.all(
      restaurants.map(async (restaurant) => {
        let placeDetails = null;
        let placeDetailsError = false;

        if (restaurant.placeId) {
          try {
            placeDetails = await fetchPlaceDetailsById({
              apiKey,
              placeId: restaurant.placeId,
            });
          } catch {
            placeDetailsError = true;
          }
        }

        const websiteUrl = toUrlOrNull(placeDetails?.websiteUri);
        const googleMapsUrl = toUrlOrNull(placeDetails?.googleMapsUri);
        const menuUrl = websiteUrl || googleMapsUrl || null;
        const menuSource = websiteUrl
          ? "official-website"
          : googleMapsUrl
            ? "google-maps"
            : null;

        const drivingInfo = userLocation
          ? await getDrivingInfo({
              apiKey,
              origin: userLocation,
              destination: restaurant.location,
            })
          : null;

        const straightDistanceMiles = userLocation
          ? haversineMiles(userLocation, restaurant.location)
          : null;
        const roundedDistanceMiles =
          typeof straightDistanceMiles === "number"
            ? Number(straightDistanceMiles.toFixed(1))
            : null;
        const estimatedDriveMinutes =
          typeof roundedDistanceMiles === "number"
            ? Math.max(1, Math.round((roundedDistanceMiles / 30) * 60))
            : null;

        return {
          ...restaurant,
          halalSign: inferHalalSign(restaurant),
          websiteUrl,
          googleMapsUrl,
          menuUrl,
          menuSource,
          internationalPhoneNumber:
            placeDetails?.internationalPhoneNumber || null,
          placeDetailsError,
          distanceMiles: roundedDistanceMiles,
          drivingDistanceText:
            drivingInfo?.drivingDistanceText ||
            (typeof roundedDistanceMiles === "number"
              ? `${roundedDistanceMiles.toFixed(1)} mi`
              : null),
          drivingTimeText:
            drivingInfo?.drivingTimeText ||
            (typeof estimatedDriveMinutes === "number"
              ? `${estimatedDriveMinutes} min (est.)`
              : null),
        };
      }),
    );

    const detailsErrorCount = enrichedRestaurants.filter(
      (restaurant) => restaurant.placeDetailsError,
    ).length;

    const sorted = [...enrichedRestaurants].sort((a, b) => {
      if (a.distanceMiles === null) {
        return 1;
      }
      if (b.distanceMiles === null) {
        return -1;
      }
      return a.distanceMiles - b.distanceMiles;
    });

    const focusedByLocation = userLocation
      ? maxDistanceMiles === null
        ? sorted
        : sorted.filter(
            (restaurant) =>
              typeof restaurant.distanceMiles === "number" &&
              restaurant.distanceMiles <= maxDistanceMiles,
          )
      : sorted;

    const totalCount = focusedByLocation.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const safePage = Math.min(page, totalPages);
    const startIndex = (safePage - 1) * pageSize;
    const pagedRestaurants = focusedByLocation.slice(
      startIndex,
      startIndex + pageSize,
    );

    return res.status(200).json({
      success: true,
      count: pagedRestaurants.length,
      totalCount,
      restaurants: pagedRestaurants,
      source: "google-places",
      hasUserLocation: Boolean(userLocation),
      pagination: {
        page: safePage,
        pageSize,
        totalPages,
        totalCount,
      },
      details: {
        requested: restaurants.length,
        errors: detailsErrorCount,
      },
      filters: {
        maxDistanceMiles,
        ethnicity,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to search restaurants.",
    });
  }
}

module.exports = {
  searchRestaurants,
};
