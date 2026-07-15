const {
  fetchPhotoMedia,
  searchMasjidsFromGoogle,
} = require("../services/googlePlacesService");
const { getDrivingInfo } = require("../services/googleRoutesService");
const { getSalahTimes } = require("../services/prayerTimesService");
const { getEventsForMasjid } = require("../services/masjidEventsService");

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

async function searchMasjids(req, res) {
  const city = (req.query.city || "").trim();
  const query = (req.query.query || "").trim();
  const userLat = toNumber(req.query.userLat);
  const userLng = toNumber(req.query.userLng);
  const maxDistanceMiles = parseDistanceFilter(req.query.maxDistanceMiles);
  const language = parseLanguage(req.query.language);
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(Math.max(1, Number(req.query.pageSize) || 6), 12);

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
    const masjids = await searchMasjidsFromGoogle({
      apiKey,
      city,
      query,
      userLocation,
      limit: 20,
      languageCode: language,
    });

    const enrichedMasjids = await Promise.all(
      masjids.map(async (masjid) => {
        const drivingInfo = userLocation
          ? await getDrivingInfo({
              apiKey,
              origin: userLocation,
              destination: masjid.location,
            })
          : null;

        const straightDistanceMiles = userLocation
          ? haversineMiles(userLocation, masjid.location)
          : null;
        const roundedDistanceMiles =
          typeof straightDistanceMiles === "number"
            ? Number(straightDistanceMiles.toFixed(1))
            : null;
        const estimatedDriveMinutes =
          typeof roundedDistanceMiles === "number"
            ? Math.max(1, Math.round((roundedDistanceMiles / 30) * 60))
            : null;

        const salahTimes = await getSalahTimes(masjid.location, language);
        const events = await getEventsForMasjid({
          placeId: masjid.placeId,
          city: masjid.city,
        });

        return {
          ...masjid,
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
          salahTimes,
          events,
        };
      }),
    );

    const sorted = [...enrichedMasjids].sort((a, b) => {
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
            (masjid) =>
              typeof masjid.distanceMiles === "number" &&
              masjid.distanceMiles <= maxDistanceMiles,
          )
      : sorted;

    const totalCount = focusedByLocation.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const safePage = Math.min(page, totalPages);
    const startIndex = (safePage - 1) * pageSize;
    const pagedMasjids = focusedByLocation.slice(
      startIndex,
      startIndex + pageSize,
    );

    return res.status(200).json({
      success: true,
      count: pagedMasjids.length,
      totalCount,
      masjids: pagedMasjids,
      source: "google-places",
      hasUserLocation: Boolean(userLocation),
      pagination: {
        page: safePage,
        pageSize,
        totalPages,
        totalCount,
      },
      filters: {
        maxDistanceMiles,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to search masjids.",
    });
  }
}

async function proxyMasjidPhoto(req, res) {
  const photoName = (req.query.name || "").trim();
  const maxWidthPx = Number(req.query.maxWidthPx) || 600;

  if (!photoName) {
    return res.status(400).json({
      success: false,
      message: "Photo name is required.",
    });
  }

  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    const media = await fetchPhotoMedia({
      apiKey,
      photoName,
      maxWidthPx,
    });

    res.setHeader("Content-Type", media.contentType);
    res.setHeader("Cache-Control", media.cacheControl);
    return res.status(200).send(media.data);
  } catch (error) {
    return res.status(502).json({
      success: false,
      message: error.message || "Failed to fetch place photo.",
    });
  }
}

module.exports = {
  proxyMasjidPhoto,
  searchMasjids,
};
