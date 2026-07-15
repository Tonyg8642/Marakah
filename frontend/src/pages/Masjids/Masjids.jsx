import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocaleFormat } from "../../hooks/useLocaleFormat";
import "./Masjids.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";
const RADIUS_STORAGE_KEY = "marakah.masjids.radiusFilter";
const VALID_RADIUS_FILTERS = new Set(["10", "25", "50", "nationwide"]);
const PRAYER_ORDER = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

function parsePrayerTimeToDate(timeValue) {
  if (!timeValue || typeof timeValue !== "string") {
    return null;
  }

  const match = timeValue.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) {
    return null;
  }

  const hours12 = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3].toUpperCase();
  if (!Number.isFinite(hours12) || !Number.isFinite(minutes)) {
    return null;
  }

  let hours24 = hours12 % 12;
  if (meridiem === "PM") {
    hours24 += 12;
  }

  const next = new Date();
  next.setSeconds(0, 0);
  next.setHours(hours24, minutes, 0, 0);
  return next;
}

function formatCountdown(ms) {
  const safeMs = Math.max(0, ms);
  const totalMinutes = Math.floor(safeMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) {
    return `${minutes}m`;
  }

  return `${hours}h ${minutes}m`;
}

function getPrayerMeta(salahTimes) {
  if (!salahTimes) {
    return {
      currentPrayerKey: "",
      nextPrayerLabel: "--",
      nextPrayerCountdown: "--",
    };
  }

  const now = new Date();
  const schedule = PRAYER_ORDER.map((key) => ({
    key,
    label: PRAYER_LABELS[key],
    date: parsePrayerTimeToDate(salahTimes[key]),
  })).filter(
    (entry) => entry.date instanceof Date && !Number.isNaN(entry.date),
  );

  if (schedule.length === 0) {
    return {
      currentPrayerKey: "",
      nextPrayerLabel: "--",
      nextPrayerCountdown: "--",
    };
  }

  const upcoming = schedule.find((entry) => entry.date > now);
  const nextPrayer = upcoming || {
    ...schedule[0],
    date: new Date(schedule[0].date.getTime() + 24 * 60 * 60 * 1000),
  };

  let currentPrayerKey = schedule[0].key;
  for (const entry of schedule) {
    if (entry.date <= now) {
      currentPrayerKey = entry.key;
    }
  }

  if (!schedule.some((entry) => entry.date <= now)) {
    currentPrayerKey = "isha";
  }

  return {
    currentPrayerKey,
    nextPrayerLabel: nextPrayer.label,
    nextPrayerCountdown: formatCountdown(
      nextPrayer.date.getTime() - now.getTime(),
    ),
  };
}

export default function Masjids() {
  const { t, i18n } = useTranslation();
  const { formatNumber, formatInteger } = useLocaleFormat();
  const [city, setCity] = useState("");
  const [query, setQuery] = useState("");
  const [radiusFilter, setRadiusFilter] = useState("25");
  const [userLocation, setUserLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState(
    t("masjids.status.allowLocation"),
  );
  const [searchStatus, setSearchStatus] = useState(
    t("masjids.status.searchHint"),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [masjids, setMasjids] = useState([]);
  const [nearestMasjid, setNearestMasjid] = useState(null);
  const [selectedMasjidId, setSelectedMasjidId] = useState("");
  const [page, setPage] = useState(1);
  const [pageInfo, setPageInfo] = useState({
    totalPages: 1,
    totalCount: 0,
    pageSize: 6,
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(RADIUS_STORAGE_KEY);
      if (saved && VALID_RADIUS_FILTERS.has(saved)) {
        setRadiusFilter(saved);
      }
    } catch {
      // Ignore storage access issues.
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(RADIUS_STORAGE_KEY, radiusFilter);
    } catch {
      // Ignore storage access issues.
    }
  }, [radiusFilter]);

  useEffect(() => {
    setLocationStatus((current) =>
      current ? current : t("masjids.status.allowLocation"),
    );
    setSearchStatus((current) => current || t("masjids.status.searchHint"));
  }, [t]);

  async function handleSearch(
    nextPage = 1,
    locationOverride = null,
    radiusOverride = null,
  ) {
    const activeLocation = locationOverride || userLocation;
    const activeRadius = radiusOverride || radiusFilter;

    if (!city.trim() && !activeLocation) {
      setSearchStatus(t("masjids.status.enterCity"));
      return;
    }

    try {
      setIsLoading(true);
      setSearchStatus(t("masjids.status.searching"));

      const params = new URLSearchParams({
        city: city.trim(),
        query: query.trim(),
        maxDistanceMiles: activeRadius,
        page: String(nextPage),
        pageSize: String(pageInfo.pageSize),
        language: i18n.language,
      });

      if (activeLocation) {
        params.set("userLat", String(activeLocation.lat));
        params.set("userLng", String(activeLocation.lng));
      }

      const response = await fetch(
        `${API_BASE_URL}/api/masjids/search?${params.toString()}`,
      );
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Search request failed.");
      }

      const rows = Array.isArray(payload.masjids) ? payload.masjids : [];
      setMasjids(rows);
      setPage(payload.pagination?.page || nextPage);
      setPageInfo({
        totalPages: payload.pagination?.totalPages || 1,
        totalCount: payload.pagination?.totalCount || rows.length,
        pageSize: payload.pagination?.pageSize || pageInfo.pageSize,
      });

      if (rows.length > 0) {
        setNearestMasjid(rows[0]);
        setSelectedMasjidId(rows[0].placeId);
        const locationMode = activeLocation
          ? activeRadius === "nationwide"
            ? t("masjids.locationMode.nationwideWithLocation")
            : t("masjids.locationMode.withinMiles", {
                miles: formatInteger(activeRadius),
              })
          : city.trim()
            ? t("masjids.locationMode.cityNationwide", {
                city: city.trim(),
              })
            : t("masjids.locationMode.search");
        setSearchStatus(
          t("masjids.resultSummary", {
            count: formatInteger(payload.pagination?.totalCount || rows.length),
            locationMode,
            page: formatInteger(payload.pagination?.page || nextPage),
            totalPages: formatInteger(payload.pagination?.totalPages || 1),
          }),
        );
      } else {
        setNearestMasjid(null);
        setSelectedMasjidId("");
        setSearchStatus(t("masjids.status.noResults"));
      }
    } catch (error) {
      setSearchStatus(error.message || t("masjids.status.searchFailed"));
    } finally {
      setIsLoading(false);
    }
  }

  function handleNextPage() {
    if (page >= pageInfo.totalPages || isLoading) {
      return;
    }

    handleSearch(page + 1);
  }

  function handlePrevPage() {
    if (page <= 1 || isLoading) {
      return;
    }

    handleSearch(page - 1);
  }

  function requestCurrentLocation(radiusOverride = null) {
    const activeRadius = radiusOverride || radiusFilter;

    if (!navigator.geolocation) {
      setLocationStatus(t("masjids.status.locationUnavailable"));
      return;
    }

    setLocationStatus(t("masjids.status.findingLocation"));

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const nextLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setUserLocation(nextLocation);
        setLocationStatus(
          `Location enabled: ${formatNumber(nextLocation.lat.toFixed(4))}, ${formatNumber(nextLocation.lng.toFixed(4))}. Focusing nearby masjids.`,
        );

        try {
          await handleSearch(1, nextLocation, activeRadius);
        } catch {
          // handleSearch sets status errors.
        }
      },
      (error) => {
        if (error?.code === 1) {
          setLocationStatus(t("masjids.status.locationDenied"));
          return;
        }

        if (error?.code === 2) {
          setLocationStatus(t("masjids.status.locationUnknown"));
          return;
        }

        if (error?.code === 3) {
          setLocationStatus(t("masjids.status.locationTimeout"));
          return;
        }

        setLocationStatus(t("masjids.status.locationFailed"));
      },
    );
  }

  function handleUseMyLocation25Miles() {
    setRadiusFilter("25");
    requestCurrentLocation("25");
  }

  const selectedMasjid = useMemo(() => {
    if (!selectedMasjidId) {
      return null;
    }

    return (
      masjids.find((masjid) => masjid.placeId === selectedMasjidId) || null
    );
  }, [masjids, selectedMasjidId]);

  const nearestPrayerMeta = useMemo(
    () => getPrayerMeta(nearestMasjid?.salahTimes),
    [nearestMasjid],
  );

  const prayerLabels = useMemo(
    () => ({
      fajr: t("masjids.prayers.fajr", { defaultValue: "Fajr" }),
      dhuhr: t("masjids.prayers.dhuhr", { defaultValue: "Dhuhr" }),
      asr: t("masjids.prayers.asr", { defaultValue: "Asr" }),
      maghrib: t("masjids.prayers.maghrib", { defaultValue: "Maghrib" }),
      isha: t("masjids.prayers.isha", { defaultValue: "Isha" }),
    }),
    [t],
  );

  return (
    <main className="page">
      <section className="page-hero">
        <p className="eyebrow">{t("masjids.eyebrow")}</p>
        <h1>{t("masjids.title")}</h1>
        <div className="masjid-search-row">
          <input
            type="search"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            placeholder={t("masjids.cityPlaceholder")}
            aria-label={t("masjids.cityPlaceholder")}
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("masjids.queryPlaceholder")}
            aria-label={t("masjids.queryPlaceholder")}
          />
          <select
            value={radiusFilter}
            onChange={(event) => setRadiusFilter(event.target.value)}
            aria-label={t("masjids.distanceFilter")}
          >
            <option value="10">{t("masjids.radiusOptions.10")}</option>
            <option value="25">{t("masjids.radiusOptions.25")}</option>
            <option value="50">{t("masjids.radiusOptions.50")}</option>
            <option value="nationwide">
              {t("masjids.radiusOptions.nationwide")}
            </option>
          </select>
          <button
            type="button"
            className="btn-primary"
            onClick={() => handleSearch(1)}
            disabled={isLoading}
          >
            {isLoading ? t("masjids.searching") : t("masjids.search")}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={requestCurrentLocation}
          >
            {t("masjids.useLocation")}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleUseMyLocation25Miles}
          >
            {t("masjids.useLocation25")}
          </button>
        </div>
        <p className="masjid-helper-text">{locationStatus}</p>
        <p className="masjid-helper-text">
          {t("masjids.distanceLine", {
            distance:
              radiusFilter === "nationwide"
                ? t("masjids.distanceValue.nationwide")
                : t("masjids.distanceValue.miles", {
                    miles: formatInteger(radiusFilter),
                  }),
          })}
        </p>
        <p className="masjid-helper-text">{searchStatus}</p>
        {pageInfo.totalCount > 0 ? (
          <p className="masjid-helper-text">
            {t("masjids.resultCount", {
              count: formatInteger(pageInfo.totalCount),
              page: formatInteger(page),
              totalPages: formatInteger(pageInfo.totalPages),
            })}
          </p>
        ) : null}

        {nearestMasjid ? (
          <article className="masjid-nearest-card">
            <p className="masjid-nearest-pill">{t("masjids.nearestMasjid")}</p>
            <h3>{nearestMasjid.name}</h3>
            <p>
              <strong>{t("masjids.city")}:</strong> {nearestMasjid.city}
            </p>
            <p>
              <strong>{t("masjids.distance")}:</strong>{" "}
              {typeof nearestMasjid.distanceMiles === "number"
                ? t("masjids.distanceFromLocation", {
                    miles: formatNumber(nearestMasjid.distanceMiles),
                  })
                : t("masjids.distanceCalcHint")}
            </p>
            <p>
              <strong>{t("masjids.driveTime")}:</strong>{" "}
              {nearestMasjid.drivingTimeText || t("masjids.driveUnknown")}
            </p>
            <p className="masjid-next-prayer">
              {t("masjids.nextPrayer", {
                label: nearestPrayerMeta.nextPrayerLabel,
                countdown: nearestPrayerMeta.nextPrayerCountdown,
              })}
            </p>
            <div
              className="masjid-salah-grid"
              role="list"
              aria-label={t("masjids.salahTimes")}
            >
              {PRAYER_ORDER.map((prayerKey) => (
                <span
                  key={`nearest-${prayerKey}`}
                  role="listitem"
                  className={`masjid-salah-card${nearestPrayerMeta.currentPrayerKey === prayerKey ? " masjid-salah-card--current" : ""}`}
                >
                  <strong>{prayerLabels[prayerKey]}</strong>
                  <span>{nearestMasjid.salahTimes?.[prayerKey] || "--"}</span>
                </span>
              ))}
            </div>
          </article>
        ) : null}
      </section>

      <section className="card-grid three">
        {masjids.map((masjid) =>
          (() => {
            const prayerMeta = getPrayerMeta(masjid.salahTimes);
            return (
              <article
                className="surface-card masjid-result-card"
                key={masjid.placeId}
              >
                {masjid.imageUrl ? (
                  <img
                    className="masjid-image"
                    src={masjid.imageUrl}
                    alt={t("masjids.imageAlt", {
                      name: masjid.name,
                      locationSuffix: masjid.city ? ` in ${masjid.city}` : "",
                    })}
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="masjid-image masjid-image--placeholder">
                    {t("masjids.noImage")}
                  </div>
                )}
                <h3>{masjid.name}</h3>
                <p>{masjid.address || masjid.city}</p>
                <p>
                  {typeof masjid.distanceMiles === "number"
                    ? t("masjids.distanceAway", {
                        miles: formatNumber(masjid.distanceMiles.toFixed(1)),
                      })
                    : t("masjids.distanceUnknown")}
                </p>
                <p>
                  {masjid.drivingDistanceText && masjid.drivingTimeText
                    ? t("masjids.driveLine", {
                        distance: masjid.drivingDistanceText,
                        time: masjid.drivingTimeText,
                      })
                    : t("masjids.distanceUnknown")}
                </p>
                <p>
                  {t("masjids.rating", { rating: masjid.rating || "N/A" })}
                  {masjid.userRatingsTotal
                    ? ` (${masjid.userRatingsTotal})`
                    : ""}
                </p>
                <p className="masjid-next-prayer">
                  {t("masjids.nextPrayer", {
                    label: prayerMeta.nextPrayerLabel,
                    countdown: prayerMeta.nextPrayerCountdown,
                  })}
                </p>
                <div
                  className="masjid-salah-grid"
                  role="list"
                  aria-label={t("masjids.salahTimes")}
                >
                  {PRAYER_ORDER.map((prayerKey) => (
                    <span
                      key={`${masjid.placeId}-${prayerKey}`}
                      role="listitem"
                      className={`masjid-salah-card${prayerMeta.currentPrayerKey === prayerKey ? " masjid-salah-card--current" : ""}`}
                    >
                      <strong>{prayerLabels[prayerKey]}</strong>
                      <span>{masjid.salahTimes?.[prayerKey] || "--"}</span>
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setSelectedMasjidId(masjid.placeId)}
                >
                  {t("masjids.viewEvents")}
                </button>
              </article>
            );
          })(),
        )}
      </section>

      {pageInfo.totalPages > 1 ? (
        <nav
          className="masjid-pagination-row"
          aria-label="Masjid search pagination"
        >
          <button
            type="button"
            className="btn-secondary"
            onClick={handlePrevPage}
            disabled={isLoading || page <= 1}
          >
            {t("masjids.previous")}
          </button>
          <span className="masjid-page-label">
            {t("masjids.pageXofY", {
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
            {t("masjids.next")}
          </button>
        </nav>
      ) : null}

      {masjids.length > 0 ? (
        <section className="surface-panel masjid-map-panel">
          <div className="masjid-live-head">
            <h2>{t("masjids.mapPins")}</h2>
            <span className="pill">{t("masjids.liveCoordinates")}</span>
          </div>
          <div className="masjid-map-links">
            {masjids.map((masjid) => (
              <a
                key={`${masjid.placeId}-map-link`}
                className="masjid-map-link"
                href={`https://www.google.com/maps?q=${masjid.location?.lat},${masjid.location?.lng}`}
                target="_blank"
                rel="noreferrer"
              >
                {t("masjids.pin", { name: masjid.name })}
              </a>
            ))}
          </div>
          {selectedMasjid?.location?.lat && selectedMasjid?.location?.lng ? (
            <iframe
              className="masjid-map-embed"
              title={`${selectedMasjid.name} map pin`}
              loading="lazy"
              src={`https://www.google.com/maps?q=${selectedMasjid.location.lat},${selectedMasjid.location.lng}&z=14&output=embed`}
            />
          ) : null}
        </section>
      ) : null}

      {selectedMasjid ? (
        <section className="surface-panel masjid-live-panel">
          <div className="masjid-live-head">
            <h2>{t("masjids.eventsAt", { name: selectedMasjid.name })}</h2>
            <span className="pill">{t("masjids.databaseBacked")}</span>
          </div>
          <ul className="list-rows">
            {(selectedMasjid.events || []).map((event) => (
              <li
                key={`${selectedMasjid.placeId}-${event.title}`}
                className="masjid-live-item"
              >
                <strong>{event.title}</strong>
                <span>{event.hall}</span>
                <span>{event.startsAt}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
