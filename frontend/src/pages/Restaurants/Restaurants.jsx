import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocaleFormat } from "../../hooks/useLocaleFormat";
import "./Restaurants.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";
const RESTAURANT_HISTORY_KEY = "marakah_restaurant_visit_history_v1";
const HALAL_STATUS_LABELS = {
  "verified-halal": "Verified Halal",
  "halal-listed": "Halal Listed",
  "halal-claimed": "Halal Claimed",
  "halal-not-verified": "Halal Not Verified",
};
const DEFAULT_HALAL_STATUS = "verified-halal,halal-listed,halal-claimed";
const ALL_HALAL_STATUS =
  "verified-halal,halal-listed,halal-claimed,halal-not-verified";

function readRestaurantHistory() {
  try {
    const raw = localStorage.getItem(RESTAURANT_HISTORY_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter(
          (entry) =>
            entry &&
            typeof entry.placeId === "string" &&
            typeof entry.name === "string" &&
            typeof entry.visitedAt === "string",
        )
      : [];
  } catch {
    return [];
  }
}

function toLower(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function compareNameMatch(a, b, query) {
  const aName = String(a?.name || "").toLowerCase();
  const bName = String(b?.name || "").toLowerCase();
  const aStarts = aName.startsWith(query);
  const bStarts = bName.startsWith(query);

  if (aStarts !== bStarts) {
    return aStarts ? -1 : 1;
  }

  const aContains = aName.includes(query);
  const bContains = bName.includes(query);
  if (aContains !== bContains) {
    return aContains ? -1 : 1;
  }

  return aName.localeCompare(bName);
}

function getEvidenceSourceLabel(source) {
  const normalized = String(source || "")
    .trim()
    .toLowerCase();
  if (!normalized) {
    return "Source unavailable";
  }

  if (normalized === "official-website") {
    return "Official website";
  }
  if (normalized === "trusted-provider") {
    return "Trusted provider";
  }
  if (normalized === "manual-verification") {
    return "Manual verification";
  }
  if (normalized === "owner-verified") {
    return "Owner verified";
  }
  if (normalized === "listing-name-address") {
    return "Listing text";
  }

  return normalized.replace(/-/g, " ");
}

export default function Restaurants() {
  const { t, i18n } = useTranslation();
  const { formatNumber, formatInteger } = useLocaleFormat();
  const [city, setCity] = useState("");
  const [nameQuery, setNameQuery] = useState("");
  const [cuisineId, setCuisineId] = useState("all-halal");
  const [cuisineSearchQuery, setCuisineSearchQuery] = useState("");
  const [radiusFilter, setRadiusFilter] = useState("25");
  const [userLocation, setUserLocation] = useState(null);
  const [showUnverified, setShowUnverified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [detailsWarning, setDetailsWarning] = useState("");
  const [disclaimer, setDisclaimer] = useState("");
  const [restaurants, setRestaurants] = useState([]);
  const [visitHistory, setVisitHistory] = useState([]);
  const [status, setStatus] = useState(
    "Enter a city or use your location, then search halal restaurants.",
  );
  const [cuisines, setCuisines] = useState([]);
  const [areCuisinesExpanded, setAreCuisinesExpanded] = useState(false);
  const [page, setPage] = useState(1);
  const [pageInfo, setPageInfo] = useState({
    totalPages: 1,
    totalCount: 0,
    pageSize: 8,
  });
  const [hasAutoLocated, setHasAutoLocated] = useState(false);

  const filteredCuisines = useMemo(() => {
    const normalized = toLower(cuisineSearchQuery);
    if (!normalized) {
      return cuisines;
    }

    return cuisines.filter((item) => {
      const values = [item.name, item.region, item.category]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());
      return values.some((value) => value.includes(normalized));
    });
  }, [cuisineSearchQuery, cuisines]);

  const topLevelCuisines = useMemo(
    () => filteredCuisines.filter((item) => item.isTopLevel),
    [filteredCuisines],
  );

  const groupedCuisines = useMemo(() => {
    const groups = new Map();
    for (const cuisine of filteredCuisines.filter((item) => !item.isTopLevel)) {
      const category = cuisine.category || "other";
      const current = groups.get(category) || [];
      current.push(cuisine);
      groups.set(category, current);
    }

    return [...groups.entries()].map(([category, values]) => ({
      category,
      values,
    }));
  }, [filteredCuisines]);

  const selectedCuisine = useMemo(
    () => cuisines.find((item) => item.id === cuisineId) || null,
    [cuisineId, cuisines],
  );

  const visibleRestaurants = useMemo(() => {
    const normalized = toLower(nameQuery);
    if (!normalized) {
      return restaurants;
    }

    return [...restaurants]
      .filter((restaurant) =>
        String(restaurant?.name || "")
          .toLowerCase()
          .includes(normalized),
      )
      .sort((a, b) => compareNameMatch(a, b, normalized));
  }, [nameQuery, restaurants]);

  const nearestRestaurant = useMemo(
    () => visibleRestaurants[0] || null,
    [visibleRestaurants],
  );

  useEffect(() => {
    setVisitHistory(readRestaurantHistory());
  }, []);

  useEffect(() => {
    localStorage.setItem(RESTAURANT_HISTORY_KEY, JSON.stringify(visitHistory));
  }, [visitHistory]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/restaurants/cuisines`,
        );
        const payload = await response.json();

        if (!response.ok || !payload.success) {
          throw new Error(payload.message || "Could not load halal cuisines.");
        }

        const items = Array.isArray(payload.cuisines) ? payload.cuisines : [];
        if (!cancelled) {
          setCuisines(items);
          if (items.some((item) => item.id === "all-halal")) {
            setCuisineId("all-halal");
          }
        }
      } catch {
        if (!cancelled) {
          setStatus("Could not load halal cuisine categories.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (hasAutoLocated || userLocation) {
      return;
    }

    if (!navigator.geolocation) {
      return;
    }

    setHasAutoLocated(true);
    requestCurrentLocation();
  }, [hasAutoLocated, userLocation]);

  function getHalalBadgeLabel(statusValue) {
    return HALAL_STATUS_LABELS[String(statusValue || "").trim()] || "Halal";
  }

  function getHalalBadgeClass(statusValue) {
    const normalized = String(statusValue || "").trim();
    if (!normalized) {
      return "restaurant-halal-status--claimed";
    }

    return `restaurant-halal-status--${normalized}`;
  }

  function saveRestaurantVisit(restaurant, action = "menu") {
    if (!restaurant?.placeId && !restaurant?.id) {
      return;
    }

    const entry = {
      placeId: restaurant.placeId || restaurant.id,
      name: restaurant.name || "Restaurant",
      address: restaurant.address || restaurant.city || "",
      websiteUrl: restaurant.websiteUrl || null,
      googleMapsUrl: restaurant.googleMapsUrl || null,
      menuUrl: restaurant.menuUrl || null,
      menuSource: restaurant.menuSource || null,
      action,
      visitedAt: new Date().toISOString(),
    };

    setVisitHistory((current) => {
      const deduped = current.filter((item) => item.placeId !== entry.placeId);
      return [entry, ...deduped].slice(0, 20);
    });
  }

  function getHistoryDestination(entry) {
    return entry.menuUrl || entry.googleMapsUrl || null;
  }

  function getMenuButtonLabel(restaurant) {
    if (!restaurant?.menuUrl) {
      return "Menu unavailable";
    }

    if (restaurant.menuSource === "official-website") {
      return "View Official Website";
    }

    return "View on Google Maps";
  }

  async function runSearch(
    nextPage = 1,
    locationOverride = null,
    nextCuisineId,
    showUnverifiedOverride,
  ) {
    const activeLocation = locationOverride || userLocation;
    const activeCuisineId =
      typeof nextCuisineId === "string" ? nextCuisineId : cuisineId;
    const activeShowUnverified =
      typeof showUnverifiedOverride === "boolean"
        ? showUnverifiedOverride
        : showUnverified;

    if (!city.trim() && !activeLocation) {
      requestCurrentLocation(activeCuisineId);
      return;
    }

    try {
      setIsLoading(true);
      setDetailsWarning("");
      setStatus("Searching halal-first results...");

      const params = new URLSearchParams({
        city: city.trim(),
        cuisine: activeCuisineId || "all-halal",
        query: nameQuery.trim(),
        radius: radiusFilter,
        page: String(nextPage),
        pageSize: String(pageInfo.pageSize),
        language: i18n.language,
        halalOnly: activeShowUnverified ? "false" : "true",
        halalStatus: activeShowUnverified
          ? ALL_HALAL_STATUS
          : DEFAULT_HALAL_STATUS,
      });

      if (activeLocation) {
        params.set("lat", String(activeLocation.lat));
        params.set("lng", String(activeLocation.lng));
      }

      const response = await fetch(
        `${API_BASE_URL}/api/restaurants/search?${params.toString()}`,
      );
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Search request failed.");
      }

      const rows = Array.isArray(payload.restaurants)
        ? payload.restaurants
        : [];
      setRestaurants(rows);
      setPage(payload.pagination?.page || nextPage);
      setPageInfo({
        totalPages: payload.pagination?.totalPages || 1,
        totalCount: payload.pagination?.totalCount || rows.length,
        pageSize: payload.pagination?.pageSize || pageInfo.pageSize,
      });
      setDisclaimer(payload.disclaimer || "");

      if (rows.length > 0) {
        setStatus(
          `Found ${formatInteger(payload.pagination?.totalCount || rows.length)} halal restaurants.`,
        );
      } else {
        const cuisineName =
          selectedCuisine?.name ||
          (activeCuisineId === "all-halal" ? "All Halal" : "selected cuisine");
        setStatus(
          `No verified or listed halal ${cuisineName} restaurants were found within ${radiusFilter} miles. Try increasing your radius.`,
        );
      }
    } catch (error) {
      setStatus(error.message || "Could not search restaurants.");
    } finally {
      setIsLoading(false);
    }
  }

  function requestCurrentLocation(nextCuisineId = null) {
    if (!navigator.geolocation) {
      setStatus("Location is unavailable on this browser.");
      return;
    }

    setStatus("Finding your location...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setUserLocation(nextLocation);
        runSearch(1, nextLocation, nextCuisineId);
      },
      () => {
        setStatus("Could not determine your location.");
      },
    );
  }

  function handleSearchClick() {
    if (userLocation) {
      runSearch(1);
      return;
    }

    if (!navigator.geolocation) {
      runSearch(1);
      return;
    }

    requestCurrentLocation();
  }

  function handleCuisineClick(nextCuisineId) {
    setCuisineId(nextCuisineId);
    runSearch(1, null, nextCuisineId);
  }

  function handleNextPage() {
    if (page >= pageInfo.totalPages || isLoading) {
      return;
    }

    runSearch(page + 1);
  }

  function handlePrevPage() {
    if (page <= 1 || isLoading) {
      return;
    }

    runSearch(page - 1);
  }

  return (
    <main className="page">
      <section className="page-hero">
        <p className="eyebrow">Dining</p>
        <h1>What do we feel like eating right now?</h1>
        <p className="restaurant-subtitle">
          Explore halal food from around the world.
        </p>
        <p className="restaurant-halal-only-badge" role="status">
          Only halal and Muslim cuisine results are shown.
        </p>

        <div className="restaurant-search-name-wrap">
          <label htmlFor="restaurant-name-search">
            Search halal restaurants by name
          </label>
          <input
            id="restaurant-name-search"
            type="search"
            value={nameQuery}
            onChange={(event) => setNameQuery(event.target.value)}
            placeholder="Search halal restaurants by name"
            aria-label="Search halal restaurants by name"
          />
        </div>

        <div className="restaurant-ethnic-row">
          <label
            htmlFor="restaurant-cuisine-search"
            className="restaurant-ethnic-label"
          >
            Search halal cuisines
          </label>
          <input
            id="restaurant-cuisine-search"
            type="search"
            value={cuisineSearchQuery}
            onChange={(event) => setCuisineSearchQuery(event.target.value)}
            placeholder="Search halal cuisines"
            aria-label="Search halal cuisines"
            className="restaurant-ethnic-search"
          />
        </div>

        <div
          className="restaurant-ethnic-chips"
          aria-label="Top halal cuisine categories"
        >
          {topLevelCuisines.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`restaurant-ethnic-chip${cuisineId === option.id ? " restaurant-ethnic-chip--active" : ""}`}
              onClick={() => handleCuisineClick(option.id)}
              aria-pressed={cuisineId === option.id}
            >
              <span className="restaurant-ethnic-chip-badge" aria-hidden="true">
                {(option.countryCode || option.name || "HL")
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
              <span>{option.name}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          className="btn-secondary restaurant-cuisine-group-toggle"
          aria-expanded={areCuisinesExpanded}
          aria-controls="restaurant-cuisine-groups"
          onClick={() => setAreCuisinesExpanded((value) => !value)}
        >
          {areCuisinesExpanded ? "Hide cuisine groups" : "Show cuisine groups"}
        </button>

        <div id="restaurant-cuisine-groups" hidden={!areCuisinesExpanded}>
          {groupedCuisines.map((group) => (
            <section key={group.category} className="restaurant-cuisine-group">
              <h2>{group.category.replace(/-/g, " ")}</h2>
              <div
                className="restaurant-ethnic-chips"
                aria-label={`${group.category} cuisines`}
              >
                {group.values.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`restaurant-ethnic-chip${cuisineId === option.id ? " restaurant-ethnic-chip--active" : ""}`}
                    onClick={() => handleCuisineClick(option.id)}
                    aria-pressed={cuisineId === option.id}
                  >
                    <span
                      className="restaurant-ethnic-chip-badge"
                      aria-hidden="true"
                    >
                      {(option.countryCode || option.name || "HL")
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                    <span>{option.name}</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="restaurant-search-row">
          <input
            type="search"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            placeholder="City, state, or ZIP"
            aria-label="City, state, or ZIP"
          />
          <select
            value={radiusFilter}
            onChange={(event) => setRadiusFilter(event.target.value)}
            aria-label="Distance filter"
          >
            <option value="10">10 miles</option>
            <option value="25">25 miles</option>
            <option value="50">50 miles</option>
            <option value="nationwide">Nationwide</option>
          </select>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSearchClick}
            disabled={isLoading}
          >
            {isLoading ? "Searching..." : "Search"}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => requestCurrentLocation(cuisineId)}
          >
            Use My Location
          </button>
        </div>

        <label className="restaurant-unverified-toggle">
          <input
            type="checkbox"
            checked={showUnverified}
            onChange={(event) => {
              const next = event.target.checked;
              setShowUnverified(next);
              runSearch(1, null, cuisineId, next);
            }}
          />
          <span>Show unverified possibilities</span>
        </label>

        <p className="restaurant-helper-text" role="status" aria-live="polite">
          {status}
        </p>
        {detailsWarning ? (
          <p className="restaurant-helper-text">{detailsWarning}</p>
        ) : null}
        {selectedCuisine ? (
          <p className="restaurant-helper-text">
            Selected halal cuisine: <strong>{selectedCuisine.name}</strong>
          </p>
        ) : null}
        {disclaimer ? (
          <p className="restaurant-helper-text restaurant-halal-disclaimer">
            {disclaimer}
          </p>
        ) : (
          <p className="restaurant-helper-text restaurant-halal-disclaimer">
            Halal status can change. Please confirm directly with the
            restaurant.
          </p>
        )}

        {pageInfo.totalCount > 0 ? (
          <p
            className="restaurant-helper-text"
            role="status"
            aria-live="polite"
          >
            Results: {formatInteger(pageInfo.totalCount)} total | Page{" "}
            {formatInteger(page)} of {formatInteger(pageInfo.totalPages)}
          </p>
        ) : null}

        {nearestRestaurant ? (
          <article className="restaurant-nearest-card">
            <p className="restaurant-nearest-pill">Nearest Halal</p>
            <h3>{nearestRestaurant.name}</h3>
            <p>{nearestRestaurant.address || nearestRestaurant.city}</p>
            <p>
              {typeof nearestRestaurant.distance === "number"
                ? `${formatNumber(nearestRestaurant.distance)} mi away`
                : "Use location to calculate distance"}
            </p>
            <p>
              {nearestRestaurant.drivingDistanceText &&
              nearestRestaurant.drivingTimeText
                ? `${nearestRestaurant.drivingDistanceText} drive (${nearestRestaurant.drivingTimeText})`
                : "Use current location for drive time"}
            </p>
          </article>
        ) : null}
      </section>

      <section className="card-grid three">
        {visibleRestaurants.map((restaurant) => {
          const evidence = Array.isArray(restaurant.halalEvidence)
            ? restaurant.halalEvidence
            : [];
          const primaryEvidence = evidence[0] || null;

          return (
            <article
              className="surface-card restaurant-result-card"
              key={restaurant.placeId || restaurant.id}
            >
              {restaurant.imageUrl ? (
                <img
                  className="restaurant-image"
                  src={restaurant.imageUrl}
                  alt={restaurant.name}
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="restaurant-image restaurant-image--placeholder">
                  No image
                </div>
              )}

              <div className="restaurant-title-row">
                <h3>{restaurant.name}</h3>
                <span
                  className={`restaurant-halal-status ${getHalalBadgeClass(restaurant.halalStatus)}`}
                  aria-label={`Halal status: ${getHalalBadgeLabel(restaurant.halalStatus)}`}
                >
                  {getHalalBadgeLabel(restaurant.halalStatus)}
                </span>
              </div>

              <p className="restaurant-cuisine-line">
                Cuisine:{" "}
                {restaurant.cuisine || selectedCuisine?.name || "All Halal"}
              </p>

              {primaryEvidence ? (
                <p className="restaurant-evidence-line">
                  Evidence source:{" "}
                  <strong>
                    {getEvidenceSourceLabel(primaryEvidence.source)}
                  </strong>
                </p>
              ) : (
                <p className="restaurant-evidence-line">
                  Evidence source: Not available
                </p>
              )}

              <p>{restaurant.address || restaurant.city}</p>
              <p>
                {typeof restaurant.distance === "number"
                  ? `${formatNumber(restaurant.distance)} mi away`
                  : "Use location to calculate distance"}
              </p>
              <p>
                {restaurant.drivingDistanceText && restaurant.drivingTimeText
                  ? `${restaurant.drivingDistanceText} drive (${restaurant.drivingTimeText})`
                  : "Drive time unavailable"}
              </p>
              <p>
                Rating: {restaurant.rating || "N/A"} (
                {formatInteger(restaurant.reviewCount || 0)} reviews)
              </p>

              <a
                className="btn-secondary restaurant-map-link"
                href={`https://www.google.com/maps?q=${restaurant.location?.lat},${restaurant.location?.lng}`}
                target="_blank"
                rel="noreferrer"
                onClick={() => saveRestaurantVisit(restaurant, "map")}
              >
                View on Google Maps
              </a>

              {restaurant.websiteUrl ? (
                <a
                  className="btn-secondary restaurant-map-link"
                  href={restaurant.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => saveRestaurantVisit(restaurant, "website")}
                >
                  View Official Website
                </a>
              ) : null}

              {restaurant.menuUrl ? (
                <a
                  className="btn-secondary restaurant-map-link"
                  href={restaurant.menuUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => saveRestaurantVisit(restaurant, "menu")}
                >
                  {getMenuButtonLabel(restaurant)}
                </a>
              ) : (
                <button type="button" className="btn-secondary" disabled>
                  {getMenuButtonLabel(restaurant)}
                </button>
              )}

              <p className="restaurant-menu-source-message">
                {restaurant.menuSource === "official-website"
                  ? "Menu and ordering information are provided by the restaurant's official website."
                  : restaurant.menuSource === "google-maps"
                    ? "An official website was not available. Check Google Maps for menu information."
                    : "Menu unavailable"}
              </p>

              <p className="restaurant-confirm-note">
                Confirm halal status directly with the restaurant.
              </p>
            </article>
          );
        })}
      </section>

      {visibleRestaurants.length === 0 && !isLoading ? (
        <section className="surface-panel stack">
          <p>
            No verified or listed halal {selectedCuisine?.name || "cuisine"}{" "}
            restaurants were found within {radiusFilter} miles. Try increasing
            your radius.
          </p>
        </section>
      ) : null}

      <section className="surface-panel stack restaurant-history-panel">
        <div className="restaurant-history-head">
          <h2>Restaurant Visit History</h2>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setVisitHistory([])}
            disabled={!visitHistory.length}
          >
            Clear History
          </button>
        </div>
        {visitHistory.length ? (
          <ul className="list-rows" aria-label="Restaurant visit history">
            {visitHistory.map((entry) => {
              const destination = getHistoryDestination(entry);
              return (
                <li
                  key={`${entry.placeId}-${entry.visitedAt}`}
                  className="restaurant-history-item"
                >
                  <div className="restaurant-history-copy">
                    <strong>{entry.name}</strong>
                    <span>{entry.address}</span>
                    <span>
                      {entry.menuSource === "official-website"
                        ? "View Official Website"
                        : entry.menuSource === "google-maps"
                          ? "View on Google Maps"
                          : "Menu unavailable"}
                    </span>
                  </div>
                  {destination ? (
                    <a
                      className="btn-secondary restaurant-map-link"
                      href={destination}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Revisit
                    </a>
                  ) : (
                    <button type="button" className="btn-secondary" disabled>
                      Menu unavailable
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p>No restaurants visited yet. Open a menu or map to save history.</p>
        )}
      </section>

      {pageInfo.totalPages > 1 ? (
        <nav
          className="restaurant-pagination-row"
          aria-label="Restaurant search pagination"
        >
          <button
            type="button"
            className="btn-secondary"
            onClick={handlePrevPage}
            disabled={isLoading || page <= 1}
          >
            Previous
          </button>
          <span className="restaurant-page-label">
            Page {formatInteger(page)} / {formatInteger(pageInfo.totalPages)}
          </span>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleNextPage}
            disabled={isLoading || page >= pageInfo.totalPages}
          >
            Next
          </button>
        </nav>
      ) : null}
    </main>
  );
}
