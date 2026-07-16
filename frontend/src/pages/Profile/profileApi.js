const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

function getProfileImageAuthHeaders(identifier) {
  const normalized = String(identifier || "").trim();
  if (!normalized) {
    return {};
  }

  return {
    "x-marakah-identifier": normalized,
  };
}

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

function normalizeProfileImage(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const profileImage = payload.profileImage || payload;
  if (!profileImage || typeof profileImage !== "object") {
    return null;
  }

  const imageUrl = String(profileImage.imageUrl || "").trim();
  const fileType = String(profileImage.fileType || "").trim();
  if (!imageUrl || !fileType.startsWith("image/")) {
    return null;
  }

  const absoluteUrl = imageUrl.startsWith("http")
    ? imageUrl
    : `${API_BASE_URL}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;

  return {
    storageProvider:
      String(profileImage.storageProvider || "local-filesystem") ||
      "local-filesystem",
    storagePath: String(profileImage.storagePath || "").trim(),
    imageUrl: absoluteUrl,
    fileName: String(profileImage.fileName || "").trim(),
    fileType,
    fileSizeBytes: Number(profileImage.fileSizeBytes) || 0,
    updatedAt:
      String(profileImage.updatedAt || "").trim() || new Date().toISOString(),
  };
}

export async function fetchProfileImage(identifier) {
  const normalized = String(identifier || "").trim();
  if (!normalized) {
    return null;
  }

  try {
    const params = new URLSearchParams({ identifier: normalized });
    const response = await fetch(
      `${API_BASE_URL}/api/preferences/profile-image?${params.toString()}`,
      {
        headers: getProfileImageAuthHeaders(normalized),
      },
    );
    const payload = await response.json();

    if (!response.ok || !payload.success) {
      return null;
    }

    return normalizeProfileImage(payload);
  } catch {
    return null;
  }
}

export async function uploadProfileImage(identifier, file) {
  const normalized = String(identifier || "").trim();
  if (!normalized || !file) {
    return null;
  }

  const formData = new FormData();
  formData.set("identifier", normalized);
  formData.set("profileImage", file);

  const response = await fetch(
    `${API_BASE_URL}/api/preferences/profile-image`,
    {
      method: "POST",
      headers: getProfileImageAuthHeaders(normalized),
      body: formData,
    },
  );
  const payload = await response.json();

  if (!response.ok || !payload.success) {
    throw new Error(
      payload.message ||
        `Failed to upload profile image (${String(response.status)}).`,
    );
  }

  return normalizeProfileImage(payload);
}

export async function removeProfileImage(identifier) {
  const normalized = String(identifier || "").trim();
  if (!normalized) {
    return false;
  }

  const response = await fetch(
    `${API_BASE_URL}/api/preferences/profile-image`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...getProfileImageAuthHeaders(normalized),
      },
      body: JSON.stringify({ identifier: normalized }),
    },
  );

  const payload = await response.json();
  return Boolean(response.ok && payload.success);
}
