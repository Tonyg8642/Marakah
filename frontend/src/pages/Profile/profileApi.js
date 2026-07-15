const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

function isValidStatNumber(value) {
  return Number.isInteger(value) && value >= 0;
}

function normalizeStats(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const stats = payload.stats || payload;
  if (!stats || typeof stats !== "object") {
    return null;
  }

  const lecturesWatched = Number(stats.lecturesWatched);
  const currentStreak = Number(stats.currentStreak);
  const savedReminders = Number(stats.savedReminders);

  if (
    !isValidStatNumber(lecturesWatched) ||
    !isValidStatNumber(currentStreak) ||
    !isValidStatNumber(savedReminders)
  ) {
    return null;
  }

  return {
    lecturesWatched,
    currentStreak,
    savedReminders,
  };
}

export async function fetchProfileStats(userKey) {
  if (!API_BASE_URL) {
    return null;
  }

  const endpoint = `${API_BASE_URL}/api/profile/stats?userKey=${encodeURIComponent(userKey)}`;

  try {
    const response = await fetch(endpoint);

    if (response.status === 404 || response.status === 501) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to load profile stats (${response.status}).`);
    }

    const payload = await response.json();
    return normalizeStats(payload);
  } catch (error) {
    // Treat network/unavailable API as empty until backend route is implemented.
    if (error instanceof TypeError) {
      return null;
    }

    throw error;
  }
}
