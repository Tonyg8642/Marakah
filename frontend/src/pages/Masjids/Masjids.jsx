import { useEffect, useMemo, useState } from "react";
import "./Masjids.css";

const masjids = [
  {
    name: "Masjid Al-Noor",
    city: "Dallas, TX",
    lat: 32.7767,
    lng: -96.797,
    events: [
      { title: "Fajr Reminder", startsInMins: 12, hall: "Prayer Hall" },
      { title: "Sisters Tajweed Circle", startsInMins: 34, hall: "Room B" },
      { title: "Youth Night", startsInMins: 96, hall: "Community Hall" },
    ],
  },
  {
    name: "Masjid Ar-Rahmah",
    city: "Irving, TX",
    lat: 32.814,
    lng: -96.9489,
    events: [
      { title: "Qur'an Study", startsInMins: 8, hall: "Library" },
      { title: "Family Halaqah", startsInMins: 41, hall: "Main Hall" },
      { title: "Volunteer Briefing", startsInMins: 120, hall: "Office Wing" },
    ],
  },
  {
    name: "Masjid As-Salaam",
    city: "Plano, TX",
    lat: 33.0198,
    lng: -96.6989,
    events: [
      { title: "After-Maghrib Tafsir", startsInMins: 18, hall: "Prayer Hall" },
      { title: "Kids Arabic Class", startsInMins: 59, hall: "Classroom 2" },
      { title: "Community Dinner", startsInMins: 140, hall: "Courtyard" },
    ],
  },
  {
    name: "Masjid Bilal",
    city: "Richardson, TX",
    lat: 32.9483,
    lng: -96.7299,
    events: [
      { title: "Dawah Workshop", startsInMins: 16, hall: "Main Hall" },
      { title: "New Muslim Support", startsInMins: 67, hall: "Room A" },
      { title: "Qiyam Prep", startsInMins: 180, hall: "Prayer Hall" },
    ],
  },
];

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

export default function Masjids() {
  const [query, setQuery] = useState("");
  const [userLocation, setUserLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState(
    "Use search or nearest to find masjids.",
  );
  const [nearestName, setNearestName] = useState("");
  const [selectedMasjidName, setSelectedMasjidName] = useState(masjids[0].name);
  const [liveTick, setLiveTick] = useState(Date.now());
  const [liveStartMs] = useState(Date.now());
  const [lastUpdatedAt, setLastUpdatedAt] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTick(Date.now());
      setLastUpdatedAt(new Date());
    }, 15000);

    return () => clearInterval(timer);
  }, []);

  const masjidsWithDistance = useMemo(() => {
    if (!userLocation) {
      return masjids;
    }

    return masjids
      .map((masjid) => ({
        ...masjid,
        distanceMiles: haversineMiles(userLocation, masjid),
      }))
      .sort((a, b) => a.distanceMiles - b.distanceMiles);
  }, [userLocation]);

  const filteredMasjids = useMemo(() => {
    if (!query.trim()) {
      return masjidsWithDistance;
    }

    const normalized = query.toLowerCase();
    return masjidsWithDistance.filter(
      (masjid) =>
        masjid.name.toLowerCase().includes(normalized) ||
        masjid.city.toLowerCase().includes(normalized),
    );
  }, [masjidsWithDistance, query]);

  const selectedMasjid = useMemo(
    () =>
      masjids.find((masjid) => masjid.name === selectedMasjidName) ??
      masjids[0],
    [selectedMasjidName],
  );

  const liveEvents = useMemo(() => {
    const tickOffset = Math.floor((liveTick - liveStartMs) / 60000);

    return selectedMasjid.events.map((event, index) => {
      const minutesUntil = event.startsInMins + tickOffset;
      const attendees = 18 + index * 7 + Math.floor((liveTick / 15000) % 9);
      const status = minutesUntil <= 0 ? "Live now" : `${minutesUntil} min`;

      return {
        ...event,
        attendees,
        status,
      };
    });
  }, [selectedMasjid, liveTick]);

  function findNearestMasjid() {
    if (!navigator.geolocation) {
      setLocationStatus("Geolocation is not supported in this browser.");
      return;
    }

    setLocationStatus("Finding your location...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const currentLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setUserLocation(currentLocation);

        const nearest = masjids
          .map((masjid) => ({
            ...masjid,
            distanceMiles: haversineMiles(currentLocation, masjid),
          }))
          .sort((a, b) => a.distanceMiles - b.distanceMiles)[0];

        setNearestName(nearest.name);
        setSelectedMasjidName(nearest.name);
        setLocationStatus(`Nearest masjid found: ${nearest.name}`);
      },
      () => {
        setLocationStatus(
          "Location permission denied. Search by city or masjid name instead.",
        );
      },
    );
  }

  return (
    <main className="page">
      <section className="page-hero">
        <p className="eyebrow">Community</p>
        <h1>Find your nearby masjid community</h1>
        <div className="masjid-search-row">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search city or masjid"
            aria-label="Search nearby masjids"
          />
          <button
            type="button"
            className="btn-primary"
            onClick={findNearestMasjid}
          >
            Search Nearest
          </button>
        </div>
        <p className="masjid-helper-text">{locationStatus}</p>
        {nearestName ? (
          <p className="masjid-nearest-pill">Nearest: {nearestName}</p>
        ) : null}
      </section>

      <section className="card-grid three">
        {filteredMasjids.map((masjid) => (
          <article className="surface-card" key={masjid.name}>
            <h3>{masjid.name}</h3>
            <p>{masjid.city}</p>
            <p>
              {typeof masjid.distanceMiles === "number"
                ? `${masjid.distanceMiles.toFixed(1)} mi away`
                : "Distance will appear after location access"}
            </p>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setSelectedMasjidName(masjid.name)}
            >
              Live Events
            </button>
          </article>
        ))}
      </section>

      <section className="surface-panel masjid-live-panel">
        <div className="masjid-live-head">
          <h2>Live events at {selectedMasjid.name}</h2>
          <span className="pill live">Auto-refresh 15s</span>
        </div>
        <p className="masjid-helper-text">
          Last updated: {lastUpdatedAt.toLocaleTimeString()}
        </p>
        <ul className="list-rows">
          {liveEvents.map((event) => (
            <li key={event.title} className="masjid-live-item">
              <strong>{event.title}</strong>
              <span>{event.hall}</span>
              <span>{event.status}</span>
              <span>{event.attendees} attending</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
