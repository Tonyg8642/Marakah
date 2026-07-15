const axios = require("axios");

const ALADHAN_TIMINGS_URL = "https://api.aladhan.com/v1/timings";
const PRAYER_CACHE_TTL_MS = 30 * 60 * 1000;
const prayerTimesCache = new Map();

function toDisplayTime(value, language = "en") {
  if (!value) {
    return "--";
  }

  const clean = value.split(" ")[0];
  const [hoursRaw, minutesRaw] = clean.split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return value;
  }

  try {
    const formatter = new Intl.DateTimeFormat(language, {
      hour: "numeric",
      minute: "2-digit",
    });
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return formatter.format(date);
  } catch {
    const period = hours >= 12 ? "PM" : "AM";
    const hour12 = hours % 12 || 12;
    return `${hour12}:${String(minutes).padStart(2, "0")} ${period}`;
  }
}

async function getSalahTimes({ lat, lng }, language = "en") {
  const cacheKey = `${Number(lat).toFixed(4)}:${Number(lng).toFixed(4)}`;
  const now = Date.now();
  const cached = prayerTimesCache.get(cacheKey);

  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  try {
    const response = await axios.get(ALADHAN_TIMINGS_URL, {
      params: {
        latitude: lat,
        longitude: lng,
        method: 2,
      },
    });

    const timings = response.data?.data?.timings;
    if (!timings) {
      return null;
    }

    const value = {
      fajr: toDisplayTime(timings.Fajr, language),
      dhuhr: toDisplayTime(timings.Dhuhr, language),
      asr: toDisplayTime(timings.Asr, language),
      maghrib: toDisplayTime(timings.Maghrib, language),
      isha: toDisplayTime(timings.Isha, language),
    };

    prayerTimesCache.set(cacheKey, {
      value,
      expiresAt: now + PRAYER_CACHE_TTL_MS,
    });

    return value;
  } catch {
    return null;
  }
}

module.exports = {
  getSalahTimes,
};
