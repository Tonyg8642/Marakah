const axios = require("axios");

const GOOGLE_PLACES_TEXT_SEARCH_URL =
  "https://places.googleapis.com/v1/places:searchText";
const GOOGLE_PLACES_PHOTO_BASE_URL = "https://places.googleapis.com/v1";
const BACKEND_PUBLIC_BASE_URL = (
  process.env.BACKEND_PUBLIC_BASE_URL || "http://localhost:3001"
).replace(/\/$/, "");
const PLACES_FIELD_MASK =
  "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.location,places.photos";
const PLACES_CACHE_TTL_MS = 15 * 60 * 1000;
const placesCache = new Map();

function getPhotoUrl(photoName) {
  if (!photoName) {
    return "";
  }

  const params = new URLSearchParams({
    maxWidthPx: "600",
    name: photoName,
  });

  return `${BACKEND_PUBLIC_BASE_URL}/api/masjids/photo?${params.toString()}`;
}

function getCityFromAddress(address = "") {
  const parts = address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 2) {
    return address;
  }

  return parts[parts.length - 3] || parts[0] || address;
}

function getPlacesRequestConfig(apiKey) {
  return {
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": PLACES_FIELD_MASK,
    },
  };
}

function toPlaceShape(place) {
  const address = place.formattedAddress || "";

  return {
    placeId: place.id || "",
    name: place.displayName?.text || "",
    address,
    city: getCityFromAddress(address),
    rating: place.rating || null,
    userRatingsTotal: place.userRatingCount || 0,
    imageUrl: getPhotoUrl(place.photos?.[0]?.name),
    location: {
      lat: place.location?.latitude,
      lng: place.location?.longitude,
    },
  };
}

async function fetchPhotoMedia({ apiKey, photoName, maxWidthPx = 600 }) {
  if (!apiKey) {
    throw new Error("GOOGLE_MAPS_API_KEY is missing.");
  }

  if (!photoName) {
    throw new Error("Photo name is required.");
  }

  const safeWidth = Math.min(Math.max(Number(maxWidthPx) || 600, 64), 1200);
  const url = `${GOOGLE_PLACES_PHOTO_BASE_URL}/${photoName}/media`;

  const response = await axios.get(url, {
    params: {
      maxWidthPx: safeWidth,
    },
    headers: {
      "X-Goog-Api-Key": apiKey,
    },
    responseType: "arraybuffer",
  });

  return {
    data: response.data,
    contentType: response.headers["content-type"] || "image/jpeg",
    cacheControl: response.headers["cache-control"] || "public, max-age=3600",
  };
}

async function searchMasjidsFromGoogle({
  apiKey,
  city,
  query,
  userLocation,
  limit = 20,
  languageCode = "en",
}) {
  if (!apiKey) {
    throw new Error("GOOGLE_MAPS_API_KEY is missing.");
  }

  const searchText = city
    ? `${query || "masjid"} in ${city}`
    : `${query || "masjid"} in United States`;
  const cacheKey = JSON.stringify({
    mode: city ? "city-text" : "nationwide-text",
    searchText,
    location: userLocation
      ? [
          Number(userLocation.lat).toFixed(3),
          Number(userLocation.lng).toFixed(3),
        ]
      : null,
    limit,
  });

  const now = Date.now();
  const cached = placesCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  let places = [];

  try {
    const textBody = {
      textQuery: searchText,
      maxResultCount: Math.max(1, limit),
      regionCode: "US",
      languageCode,
    };

    if (userLocation) {
      textBody.locationBias = {
        circle: {
          center: {
            latitude: userLocation.lat,
            longitude: userLocation.lng,
          },
          radius: 50000,
        },
      };
    }

    const response = await axios.post(
      GOOGLE_PLACES_TEXT_SEARCH_URL,
      textBody,
      getPlacesRequestConfig(apiKey),
    );
    places = Array.isArray(response.data?.places) ? response.data.places : [];
  } catch (error) {
    const status = error.response?.data?.error?.status;
    const message = error.response?.data?.error?.message;
    if (status || message) {
      throw new Error(
        `${status || "PLACES_API_ERROR"}: ${message || "Places API request failed."}`,
      );
    }
    throw error;
  }

  const value = places
    .slice(0, Math.max(1, limit))
    .map((place) => toPlaceShape(place));

  placesCache.set(cacheKey, {
    value,
    expiresAt: now + PLACES_CACHE_TTL_MS,
  });

  return value;
}

module.exports = {
  fetchPhotoMedia,
  searchMasjidsFromGoogle,
};
