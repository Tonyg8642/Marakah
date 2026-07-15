const STORAGE_PREFIX = "marakah_profile_v1";

function getStorageKey(userKey, collectionName) {
  return `${STORAGE_PREFIX}:${userKey}:${collectionName}`;
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function createProfileUserKey(userName) {
  const normalized = String(userName || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "guest";
}

export function readCollection(userKey, collectionName) {
  const storageKey = getStorageKey(userKey, collectionName);
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (item) => isPlainObject(item) && typeof item.id === "string",
    );
  } catch {
    return [];
  }
}

export function writeCollection(userKey, collectionName, records) {
  const storageKey = getStorageKey(userKey, collectionName);
  const safeRecords = Array.isArray(records)
    ? records.filter(
        (item) => isPlainObject(item) && typeof item.id === "string",
      )
    : [];

  localStorage.setItem(storageKey, JSON.stringify(safeRecords));
}

export function readStoredObject(
  userKey,
  collectionName,
  fallbackValue = null,
) {
  const storageKey = getStorageKey(userKey, collectionName);
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return fallbackValue;
    }

    const parsed = JSON.parse(raw);
    return isPlainObject(parsed) ? parsed : fallbackValue;
  } catch {
    return fallbackValue;
  }
}

export function writeStoredObject(userKey, collectionName, value) {
  const storageKey = getStorageKey(userKey, collectionName);
  if (!isPlainObject(value)) {
    localStorage.removeItem(storageKey);
    return;
  }

  localStorage.setItem(storageKey, JSON.stringify(value));
}

export function removeStoredValue(userKey, collectionName) {
  const storageKey = getStorageKey(userKey, collectionName);
  localStorage.removeItem(storageKey);
}
