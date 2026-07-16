import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocaleFormat } from "../../hooks/useLocaleFormat";
import {
  RESTAURANT_FILTER_IDENTITY_IDS,
  PROFILE_FLAG_OPTIONS_BY_ID,
} from "../Profile/countryFlagConfig";
import "./Restaurants.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";
const RESTAURANT_HISTORY_KEY = "marakah_restaurant_visit_history_v1";

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

export default function Restaurants() {
  const { t, i18n } = useTranslation();
  const { formatNumber, formatInteger } = useLocaleFormat();
  const [city, setCity] = useState("");
  const [query, setQuery] = useState("");
  const [ethnicityId, setEthnicityId] = useState("");
  const [ethnicitySearchQuery, setEthnicitySearchQuery] = useState("");
  const [radiusFilter, setRadiusFilter] = useState("25");
  const [userLocation, setUserLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [detailsWarning, setDetailsWarning] = useState("");
  const [restaurants, setRestaurants] = useState([]);
  const [visitHistory, setVisitHistory] = useState([]);
  const [status, setStatus] = useState(
    t("restaurants.status.searchHint", {
      defaultValue: "Enter a city or use your location, then search.",
    }),
  );
  const [page, setPage] = useState(1);
  const [pageInfo, setPageInfo] = useState({
    totalPages: 1,
    totalCount: 0,
    pageSize: 8,
  });
  const [hasAutoLocated, setHasAutoLocated] = useState(false);

  const ethnicityOptions = useMemo(
    () =>
      RESTAURANT_FILTER_IDENTITY_IDS.map(
        (id) => PROFILE_FLAG_OPTIONS_BY_ID[id],
      ).filter(Boolean),
    [],
  );

  const selectedEthnicityOption = useMemo(
    () => ethnicityOptions.find((option) => option.id === ethnicityId) || null,
    [ethnicityId, ethnicityOptions],
  );

  const filteredEthnicityOptions = useMemo(() => {
    const normalized = ethnicitySearchQuery.trim().toLowerCase();
    if (!normalized) {
      return ethnicityOptions;
    }

    return ethnicityOptions.filter((option) =>
      option.displayName.toLowerCase().includes(normalized),
    );
  }, [ethnicityOptions, ethnicitySearchQuery]);

  useEffect(() => {
    setVisitHistory(readRestaurantHistory());
  }, []);

  useEffect(() => {
    localStorage.setItem(RESTAURANT_HISTORY_KEY, JSON.stringify(visitHistory));
  }, [visitHistory]);

  async function runSearch(
    nextPage = 1,
    locationOverride = null,
    ethnicOverrideId = null,
  ) {
    const activeLocation = locationOverride || userLocation;
    const queryText = query.trim();
    const activeEthnicityId =
      typeof ethnicOverrideId === "string" ? ethnicOverrideId : ethnicityId;
    const activeEthnicity = ethnicityOptions.find(
      (option) => option.id === activeEthnicityId,
    );
    const normalizedEthnicText = (activeEthnicity?.displayName || "").trim();

    const composedQuery = normalizedEthnicText
      ? queryText
        ? `halal ${normalizedEthnicText} restaurant ${queryText}`
        : `halal ${normalizedEthnicText} restaurant`
      : queryText;

    if (!city.trim() && !activeLocation) {
      requestCurrentLocation(normalizedEthnicText);
      return;
    }

    try {
      setIsLoading(true);
      setDetailsWarning("");
      setStatus(
        t("restaurants.status.searching", {
          defaultValue:
            "Searching nearest halal restaurants and loading menu sources...",
        }),
      );

      const params = new URLSearchParams({
        city: city.trim(),
        query: composedQuery,
        maxDistanceMiles: radiusFilter,
        page: String(nextPage),
        pageSize: String(pageInfo.pageSize),
        language: i18n.language,
      });

      if (normalizedEthnicText) {
        params.set("ethnicity", normalizedEthnicText);
      }

      if (activeLocation) {
        params.set("userLat", String(activeLocation.lat));
        params.set("userLng", String(activeLocation.lng));
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

      if (rows.length > 0) {
        if ((payload.details?.errors || 0) > 0) {
          setDetailsWarning(
            t("restaurants.detailsPartialError", {
              defaultValue:
                "Some restaurant details were unavailable. Menu links may be missing for some results.",
            }),
          );
        }

        setStatus(
          t("restaurants.status.results", {
            defaultValue: "Found {{count}} halal restaurants.",
            count: formatInteger(payload.pagination?.totalCount || rows.length),
          }),
        );
      } else {
        setStatus(
          t("restaurants.status.noResults", {
            defaultValue: "No halal restaurants found for that search.",
          }),
        );
      }
    } catch (error) {
      setStatus(
        error.message ||
          t("restaurants.status.searchFailed", {
            defaultValue: "Could not search restaurants.",
          }),
      );
    } finally {
      setIsLoading(false);
    }
  }

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

  function getMenuButtonLabel(restaurant) {
    if (!restaurant?.menuUrl) {
      return t("restaurants.menuUnavailable", {
        defaultValue: "Menu unavailable",
      });
    }

    if (restaurant.menuSource === "official-website") {
      return t("restaurants.viewOfficialWebsite", {
        defaultValue: "View Official Website",
      });
    }

    return t("restaurants.viewOnGoogleMaps", {
      defaultValue: "View on Google Maps",
    });
  }

  function getMenuSourceMessage(restaurant) {
    if (!restaurant?.menuUrl) {
      return t("restaurants.menuUnavailable", {
        defaultValue: "Menu unavailable",
      });
    }

    if (restaurant.menuSource === "official-website") {
      return t("restaurants.menuSourceOfficial", {
        defaultValue:
          "Menu and ordering information are provided by the restaurant's official website.",
      });
    }

    return t("restaurants.menuSourceGoogleMaps", {
      defaultValue:
        "An official website was not available. Check Google Maps for menu information.",
    });
  }

  function saveRestaurantVisit(restaurant, action = "menu") {
    if (!restaurant?.placeId) {
      return;
    }

    const entry = {
      placeId: restaurant.placeId,
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
      const deduped = current.filter(
        (item) => item.placeId !== restaurant.placeId,
      );
      return [entry, ...deduped].slice(0, 20);
    });
  }

  function getHistoryDestination(entry) {
    return entry.menuUrl || entry.googleMapsUrl || null;
  }

  function handleClearHistory() {
    setVisitHistory([]);
  }

  function requestCurrentLocation(ethnicOverride = null) {
    if (!navigator.geolocation) {
      setStatus(
        t("restaurants.status.locationUnavailable", {
          defaultValue: "Location is unavailable on this browser.",
        }),
      );
      return;
    }

    setStatus(
      t("restaurants.status.findingLocation", {
        defaultValue: "Finding your location...",
      }),
    );

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setUserLocation(nextLocation);
        runSearch(1, nextLocation, ethnicOverride);
      },
      () => {
        setStatus(
          t("restaurants.status.locationFailed", {
            defaultValue: "Could not determine your location.",
          }),
        );
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

    setStatus(
      t("restaurants.status.findingLocation", {
        defaultValue: "Finding your location...",
      }),
    );

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setUserLocation(nextLocation);
        runSearch(1, nextLocation);
      },
      () => {
        // If location is blocked, still run city-based search.
        runSearch(1);
      },
    );
  }

  function handleEthnicityTabClick(nextEthnicity) {
    setEthnicityId(nextEthnicity);
    setQuery("");
    runSearch(1, null, nextEthnicity);
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

  const nearestRestaurant = useMemo(
    () => restaurants[0] || null,
    [restaurants],
  );

  return (
    <main className="page">
      <section className="page-hero">
        <p className="eyebrow">
          {t("restaurants.eyebrow", { defaultValue: "Dining" })}
        </p>
        <h1>
          {t("restaurants.title", {
            defaultValue: "Find Nearby Halal Restaurants",
          })}
        </h1>

        <div className="restaurant-ethnic-row">
          <label
            htmlFor="restaurant-ethnic-filter"
            className="restaurant-ethnic-label"
          >
            {t("restaurants.ethnicLabel", {
              defaultValue: "Search Specific Ethnic Cuisine",
            })}
          </label>
          <input
            type="search"
            value={ethnicitySearchQuery}
            onChange={(event) => setEthnicitySearchQuery(event.target.value)}
            placeholder={t("restaurants.ethnicitySearchPlaceholder", {
              defaultValue: "Search identities",
            })}
            aria-label={t("restaurants.ethnicitySearchPlaceholder", {
              defaultValue: "Search identities",
            })}
            className="restaurant-ethnic-search"
          />
          <select
            id="restaurant-ethnic-filter"
            value={ethnicityId}
            onChange={(event) => handleEthnicityTabClick(event.target.value)}
            aria-label={t("restaurants.ethnicLabel", {
              defaultValue: "Search Specific Ethnic Cuisine",
            })}
          >
            <option value="">
              {t("restaurants.allHalalCuisines", {
                defaultValue: "All halal cuisines",
              })}
            </option>
            {filteredEthnicityOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {t(option.displayNameKey, {
                  defaultValue: option.displayName,
                })}
              </option>
            ))}
          </select>
        </div>

        <div
          className="restaurant-ethnic-chips"
          aria-label="Ethnic cuisine quick filters"
        >
          <button
            type="button"
            className={`restaurant-ethnic-chip${ethnicityId === "" ? " restaurant-ethnic-chip--active" : ""}`}
            onClick={() => handleEthnicityTabClick("")}
          >
            {t("restaurants.allHalalCuisines", {
              defaultValue: "All halal cuisines",
            })}
          </button>
          {filteredEthnicityOptions.map((option) => (
            <button
              key={`ethnic-${option.id}`}
              type="button"
              className={`restaurant-ethnic-chip${ethnicityId === option.id ? " restaurant-ethnic-chip--active" : ""}`}
              onClick={() => handleEthnicityTabClick(option.id)}
            >
              {option.visualType === "flag" && option.assetPath ? (
                <img
                  className="restaurant-ethnic-chip-flag"
                  src={option.assetPath}
                  alt={t(option.accessibilityLabelKey, {
                    defaultValue: option.accessibilityLabel,
                  })}
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <span
                  className="restaurant-ethnic-chip-badge"
                  aria-hidden="true"
                >
                  {option.badgeText || "ID"}
                </span>
              )}
              <span>
                {t(option.displayNameKey, {
                  defaultValue: option.displayName,
                })}
              </span>
            </button>
          ))}
        </div>

        <div className="restaurant-search-row">
          <input
            type="search"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            placeholder={t("restaurants.cityPlaceholder", {
              defaultValue: "City, state, or ZIP",
            })}
            aria-label={t("restaurants.cityPlaceholder", {
              defaultValue: "City, state, or ZIP",
            })}
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("restaurants.queryPlaceholder", {
              defaultValue: "Cuisine or keyword (optional)",
            })}
            aria-label={t("restaurants.queryPlaceholder", {
              defaultValue: "Cuisine or keyword (optional)",
            })}
          />
          <select
            value={radiusFilter}
            onChange={(event) => setRadiusFilter(event.target.value)}
            aria-label={t("restaurants.distanceFilter", {
              defaultValue: "Distance filter",
            })}
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
            {isLoading
              ? t("restaurants.searching", { defaultValue: "Searching..." })
              : t("restaurants.search", { defaultValue: "Search" })}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={requestCurrentLocation}
          >
            {t("restaurants.useLocation", { defaultValue: "Use My Location" })}
          </button>
        </div>

        <p className="restaurant-helper-text">{status}</p>
        {detailsWarning ? (
          <p className="restaurant-helper-text">{detailsWarning}</p>
        ) : null}
        {selectedEthnicityOption ? (
          <p className="restaurant-helper-text">
            {t("restaurants.ethnicActive", {
              defaultValue: "Ethnic cuisine filter: {{ethnicity}}",
              ethnicity: t(selectedEthnicityOption.displayNameKey, {
                defaultValue: selectedEthnicityOption.displayName,
              }),
            })}
          </p>
        ) : null}
        <p className="restaurant-helper-text">
          {t("restaurants.distanceLine", {
            defaultValue: "Distance filter: {{distance}}.",
            distance:
              radiusFilter === "nationwide"
                ? t("restaurants.distanceNationwide", {
                    defaultValue: "Nationwide",
                  })
                : t("restaurants.distanceMiles", {
                    defaultValue: "{{miles}} miles",
                    miles: formatInteger(radiusFilter),
                  }),
          })}
        </p>

        {pageInfo.totalCount > 0 ? (
          <p className="restaurant-helper-text">
            {t("restaurants.resultCount", {
              defaultValue:
                "Results: {{count}} total | Page {{page}} of {{totalPages}}",
              count: formatInteger(pageInfo.totalCount),
              page: formatInteger(page),
              totalPages: formatInteger(pageInfo.totalPages),
            })}
          </p>
        ) : null}

        {nearestRestaurant ? (
          <article className="restaurant-nearest-card">
            <p className="restaurant-nearest-pill">
              {t("restaurants.nearest", { defaultValue: "Nearest Halal" })}
            </p>
            <h3>{nearestRestaurant.name}</h3>
            <p>{nearestRestaurant.address || nearestRestaurant.city}</p>
            <p>
              {typeof nearestRestaurant.distanceMiles === "number"
                ? t("restaurants.distanceAway", {
                    defaultValue: "{{miles}} mi away",
                    miles: formatNumber(nearestRestaurant.distanceMiles),
                  })
                : t("restaurants.distanceUnknown", {
                    defaultValue: "Use location to calculate distance",
                  })}
            </p>
            <p>
              {nearestRestaurant.drivingDistanceText &&
              nearestRestaurant.drivingTimeText
                ? t("restaurants.driveLine", {
                    defaultValue: "{{distance}} drive ({{time}})",
                    distance: nearestRestaurant.drivingDistanceText,
                    time: nearestRestaurant.drivingTimeText,
                  })
                : t("restaurants.driveUnknown", {
                    defaultValue: "Use current location for drive time",
                  })}
            </p>
          </article>
        ) : null}
      </section>

      <section className="card-grid three">
        {restaurants.map((restaurant) => (
          <article
            className="surface-card restaurant-result-card"
            key={restaurant.placeId}
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
                {t("restaurants.noImage", { defaultValue: "No image" })}
              </div>
            )}

            <div className="restaurant-title-row">
              <h3>{restaurant.name}</h3>
              <span
                className={`restaurant-halal-sign restaurant-halal-sign--${restaurant.halalSign || "halal"}`}
              >
                {restaurant.halalSign === "zabiha"
                  ? t("restaurants.sign.zabiha", { defaultValue: "ZABIHA" })
                  : t("restaurants.sign.halal", { defaultValue: "HALAL" })}
              </span>
            </div>

            <p>{restaurant.address || restaurant.city}</p>
            <p>
              {typeof restaurant.distanceMiles === "number"
                ? t("restaurants.distanceAway", {
                    defaultValue: "{{miles}} mi away",
                    miles: formatNumber(restaurant.distanceMiles),
                  })
                : t("restaurants.distanceUnknown", {
                    defaultValue: "Use location to calculate distance",
                  })}
            </p>
            <p>
              {restaurant.drivingDistanceText && restaurant.drivingTimeText
                ? t("restaurants.driveLine", {
                    defaultValue: "{{distance}} drive ({{time}})",
                    distance: restaurant.drivingDistanceText,
                    time: restaurant.drivingTimeText,
                  })
                : t("restaurants.driveUnknown", {
                    defaultValue: "Drive time unavailable",
                  })}
            </p>
            <p>
              {t("restaurants.rating", {
                defaultValue: "Rating: {{rating}}",
                rating: restaurant.rating || "N/A",
              })}
            </p>
            <a
              className="btn-secondary restaurant-map-link"
              href={`https://www.google.com/maps?q=${restaurant.location?.lat},${restaurant.location?.lng}`}
              target="_blank"
              rel="noreferrer"
              onClick={() => saveRestaurantVisit(restaurant, "map")}
            >
              {t("restaurants.openMap", { defaultValue: "Open in Maps" })}
            </a>
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
              {getMenuSourceMessage(restaurant)}
            </p>
          </article>
        ))}
      </section>

      <section className="surface-panel stack restaurant-history-panel">
        <div className="restaurant-history-head">
          <h2>
            {t("restaurants.historyTitle", {
              defaultValue: "Restaurant Visit History",
            })}
          </h2>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleClearHistory}
            disabled={!visitHistory.length}
          >
            {t("restaurants.clearHistory", {
              defaultValue: "Clear History",
            })}
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
                        ? t("restaurants.viewOfficialWebsite", {
                            defaultValue: "View Official Website",
                          })
                        : entry.menuSource === "google-maps"
                          ? t("restaurants.viewOnGoogleMaps", {
                              defaultValue: "View on Google Maps",
                            })
                          : t("restaurants.menuUnavailable", {
                              defaultValue: "Menu unavailable",
                            })}
                    </span>
                  </div>
                  {destination ? (
                    <a
                      className="btn-secondary restaurant-map-link"
                      href={destination}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t("restaurants.revisit", { defaultValue: "Revisit" })}
                    </a>
                  ) : (
                    <button type="button" className="btn-secondary" disabled>
                      {t("restaurants.menuUnavailable", {
                        defaultValue: "Menu unavailable",
                      })}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p>
            {t("restaurants.historyEmpty", {
              defaultValue:
                "No restaurants visited yet. Open a menu or map to save history.",
            })}
          </p>
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
            {t("restaurants.previous", { defaultValue: "Previous" })}
          </button>
          <span className="restaurant-page-label">
            {t("restaurants.pageXofY", {
              defaultValue: "Page {{page}} / {{totalPages}}",
              page: formatInteger(page),
              totalPages: formatInteger(pageInfo.totalPages),
            })}
          </span>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleNextPage}
            disabled={isLoading || page >= pageInfo.totalPages}
          >
            {t("restaurants.next", { defaultValue: "Next" })}
          </button>
        </nav>
      ) : null}
    </main>
  );
}
