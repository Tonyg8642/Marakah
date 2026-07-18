const {
  fetchPlaceDetailsById,
  searchHalalRestaurantsFromGoogle,
} = require("../services/googlePlacesService");
const { getDrivingInfo } = require("../services/googleRoutesService");
const {
  getHalalCuisineById,
  listHalalCuisines,
} = require("../services/halalCuisineConfigService");

const HALAL_STATUS = {
  VERIFIED: "verified-halal",
  LISTED: "halal-listed",
  CLAIMED: "halal-claimed",
  NOT_VERIFIED: "halal-not-verified",
};

const TRUSTED_HALAL_SOURCES = new Set([
  "official-website",
  "trusted-provider",
  "manual-verification",
  "owner-verified",
]);

const HALAL_SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;
const searchCache = new Map();

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDistanceFilter(rawRadius, rawMaxDistanceMiles) {
  const first = String(rawRadius || rawMaxDistanceMiles || "")
    .trim()
    .toLowerCase();

  if (first === "nationwide" || first === "all") {
    return null;
  }

  const parsed = toNumber(rawRadius ?? rawMaxDistanceMiles);
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

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return defaultValue;
}

function parseHalalStatusFilter(rawValue) {
  const normalized = String(rawValue || "")
    .trim()
    .toLowerCase();
  if (!normalized) {
    return new Set([
      HALAL_STATUS.VERIFIED,
      HALAL_STATUS.LISTED,
      HALAL_STATUS.CLAIMED,
    ]);
  }

  const accepted = new Set(Object.values(HALAL_STATUS));
  const requested = normalized
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => accepted.has(item));

  return requested.length
    ? new Set(requested)
    : new Set([HALAL_STATUS.VERIFIED]);
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

function toUrlOrNull(value) {
  const raw = String(value || "").trim();
  return /^https?:\/\//i.test(raw) ? raw : null;
}

function getCacheKey(payload) {
  return JSON.stringify(payload);
}

function readCachedSearch(cacheKey) {
  const current = searchCache.get(cacheKey);
  if (!current) {
    return null;
  }

  if (current.expiresAt <= Date.now()) {
    searchCache.delete(cacheKey);
    return null;
  }

  return current.value;
}

function writeCachedSearch(cacheKey, value) {
  searchCache.set(cacheKey, {
    value,
    expiresAt: Date.now() + HALAL_SEARCH_CACHE_TTL_MS,
  });
}

function detectHalalEvidence({
  restaurant,
  placeDetails,
  websiteUrl,
  menuUrl,
}) {
  const evidence = [];
  const halalRegex =
    /\b(halal|zabiha|zabihah|dhabiha|muslim-owned|muslim owned|hand[-\s]?slaughtered)\b/i;

  const listingText =
    `${restaurant.name || ""} ${restaurant.address || ""}`.trim();
  if (halalRegex.test(listingText)) {
    evidence.push({
      source: "listing-name-address",
      text: listingText,
      url: null,
    });
  }

  const editorialText = String(
    restaurant.editorialSummary || placeDetails?.editorialSummary?.text || "",
  ).trim();
  if (editorialText && halalRegex.test(editorialText)) {
    evidence.push({
      source: "trusted-provider",
      text: editorialText,
      url: null,
    });
  }

  const providerTypes = Array.isArray(restaurant.types) ? restaurant.types : [];
  const hasProviderHalalType = providerTypes.some((item) =>
    /halal/i.test(String(item || "")),
  );
  if (hasProviderHalalType) {
    evidence.push({
      source: "trusted-provider",
      text: `Provider type: ${providerTypes.join(", ")}`,
      url: null,
    });
  }

  if (websiteUrl && halalRegex.test(websiteUrl)) {
    evidence.push({
      source: "official-website",
      text: "Website URL includes halal keyword",
      url: websiteUrl,
    });
  }

  if (menuUrl && halalRegex.test(menuUrl)) {
    evidence.push({
      source: "official-website",
      text: "Menu URL includes halal keyword",
      url: menuUrl,
    });
  }

  return evidence;
}

function assignHalalStatus(evidence) {
  if (!Array.isArray(evidence) || evidence.length === 0) {
    return HALAL_STATUS.NOT_VERIFIED;
  }

  if (
    evidence.some((item) =>
      TRUSTED_HALAL_SOURCES.has(String(item.source || "")),
    )
  ) {
    return HALAL_STATUS.VERIFIED;
  }

  if (
    evidence.some((item) =>
      ["trusted-provider", "provider-listing"].includes(
        String(item.source || ""),
      ),
    )
  ) {
    return HALAL_STATUS.LISTED;
  }

  return HALAL_STATUS.CLAIMED;
}

function buildSearchText({ cuisine, query }) {
  const rawQuery = String(query || "").trim();
  const cuisineSearchTerms = cuisine?.searchTerms || [];

  if (cuisineSearchTerms.length) {
    const primary = cuisineSearchTerms[0];
    return rawQuery ? `${primary} ${rawQuery}` : primary;
  }

  return rawQuery ? `halal restaurant ${rawQuery}` : "halal restaurant";
}

function mapLegacyCuisineId(rawEthnicity) {
  const normalized = String(rawEthnicity || "")
    .trim()
    .toLowerCase();

  if (!normalized) {
    return "";
  }

  if (normalized === "desi") {
    return "desi";
  }

  if (normalized === "persian") {
    return "persian";
  }

  if (normalized === "indonesian") {
    return "indonesian";
  }

  if (normalized === "arab") {
    return "arab";
  }

  return "";
}

async function listCuisines(req, res) {
  return res.status(200).json({
    success: true,
    cuisines: listHalalCuisines(),
  });
}

async function searchRestaurants(req, res) {
  const city = String(req.query.city || "").trim();
  const query = String(req.query.query || "").trim();
  const cuisineId = String(req.query.cuisine || "")
    .trim()
    .toLowerCase();
  const legacyCuisineId = mapLegacyCuisineId(req.query.ethnicity);
  const effectiveCuisineId = cuisineId || legacyCuisineId;
  const cuisine = effectiveCuisineId
    ? getHalalCuisineById(effectiveCuisineId)
    : getHalalCuisineById("all-halal");

  if (effectiveCuisineId && !cuisine) {
    return res.status(400).json({
      success: false,
      message: "Unsupported cuisine id.",
    });
  }

  const userLat = toNumber(req.query.lat ?? req.query.userLat);
  const userLng = toNumber(req.query.lng ?? req.query.userLng);
  const maxDistanceMiles = parseDistanceFilter(
    req.query.radius,
    req.query.maxDistanceMiles,
  );
  const language = parseLanguage(req.query.language);
  const halalOnly = parseBoolean(req.query.halalOnly, true);
  const halalStatusFilter = parseHalalStatusFilter(req.query.halalStatus);
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

  const searchText = buildSearchText({ cuisine, query });
  const cacheKey = getCacheKey({
    city,
    searchText,
    maxDistanceMiles,
    userLocation,
    language,
    page,
    pageSize,
    halalOnly,
    halalStatus: [...halalStatusFilter].sort(),
    cuisineId: cuisine?.id || "all-halal",
  });

  const cached = readCachedSearch(cacheKey);
  if (cached) {
    return res.status(200).json(cached);
  }

  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    const restaurants = await searchHalalRestaurantsFromGoogle({
      apiKey,
      city,
      query: searchText,
      userLocation,
      limit: 32,
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

        const halalEvidence = detectHalalEvidence({
          restaurant,
          placeDetails,
          websiteUrl,
          menuUrl,
        });
        const halalStatus = assignHalalStatus(halalEvidence);

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
          id: restaurant.placeId || "",
          placeId: restaurant.placeId || "",
          name: restaurant.name || "",
          cuisine: cuisine?.name || "All Halal",
          address: restaurant.address || "",
          city: restaurant.city || "",
          rating: restaurant.rating || null,
          reviewCount: restaurant.userRatingsTotal || 0,
          imageUrl: restaurant.imageUrl || "",
          location: restaurant.location,
          distance: roundedDistanceMiles,
          driveTime: drivingInfo?.drivingTimeText || null,
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
          websiteUrl,
          googleMapsUrl,
          menuUrl,
          menuSource,
          halalStatus,
          halalEvidence,
          halalLastChecked: new Date().toISOString(),
          placeDetailsError,
        };
      }),
    );

    const halalFiltered = enrichedRestaurants.filter((restaurant) => {
      if (!halalStatusFilter.has(restaurant.halalStatus)) {
        return false;
      }

      if (halalOnly && restaurant.halalStatus === HALAL_STATUS.NOT_VERIFIED) {
        return false;
      }

      return true;
    });

    const sorted = [...halalFiltered].sort((a, b) => {
      if (a.distance === null) {
        return 1;
      }
      if (b.distance === null) {
        return -1;
      }
      return a.distance - b.distance;
    });

    const focusedByLocation = userLocation
      ? maxDistanceMiles === null
        ? sorted
        : sorted.filter(
            (restaurant) =>
              typeof restaurant.distance === "number" &&
              restaurant.distance <= maxDistanceMiles,
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

    const responsePayload = {
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
      filters: {
        cuisine: cuisine?.id || "all-halal",
        query,
        maxDistanceMiles,
        halalOnly,
        halalStatus: [...halalStatusFilter],
      },
      disclaimer:
        "Halal status can change. Please confirm directly with the restaurant.",
    };

    writeCachedSearch(cacheKey, responsePayload);

    return res.status(200).json(responsePayload);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to search restaurants.",
    });
  }
}

module.exports = {
  listCuisines,
  searchRestaurants,
  HALAL_STATUS,
};
