import {
  SISTER_BADIA_PLAYLIST_URL,
  sisterBadiaVideos,
} from "../data/sisterBadiaVideos";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

const CACHE_KEY = "marakahSisterBadiaPlaylistCache";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

function readCachedPlaylist() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    const savedAt = Number(parsed?.savedAt || 0);
    const videos = Array.isArray(parsed?.videos) ? parsed.videos : [];

    if (!savedAt || Date.now() - savedAt > CACHE_TTL_MS || !videos.length) {
      return null;
    }

    return videos;
  } catch {
    return null;
  }
}

function saveCachedPlaylist(videos) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    CACHE_KEY,
    JSON.stringify({
      savedAt: Date.now(),
      videos,
    }),
  );
}

function normalizeVideos(videos) {
  return (Array.isArray(videos) ? videos : [])
    .filter((video) => video && video.youtubeVideoId)
    .map((video, index) => ({
      id:
        String(video.id || "").trim() ||
        `sister-badia-session-${Number(video.sessionNumber || index + 1)}`,
      sessionNumber: Number(video.sessionNumber || index + 1),
      title: String(video.title || "").trim() || "Untitled session",
      teacher: String(video.teacher || "").trim() || "Sister Badia Khazaal",
      youtubeVideoId: String(video.youtubeVideoId || "").trim(),
      youtubeUrl:
        String(video.youtubeUrl || "").trim() ||
        `https://www.youtube.com/watch?v=${video.youtubeVideoId}`,
      thumbnailUrl:
        String(video.thumbnailUrl || "").trim() ||
        `https://img.youtube.com/vi/${video.youtubeVideoId}/hqdefault.jpg`,
    }))
    .sort((a, b) => a.sessionNumber - b.sessionNumber);
}

export async function fetchSisterBadiaPlaylist() {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/youtube/sister-badia-playlist`,
    );
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload?.message || "Failed to load playlist.");
    }

    const normalized = normalizeVideos(payload?.videos);
    if (normalized.length) {
      saveCachedPlaylist(normalized);
      return {
        videos: normalized,
        source: "network",
      };
    }

    return {
      videos: normalizeVideos(sisterBadiaVideos),
      source: "fallback",
      message: payload?.message || "No sessions are available.",
    };
  } catch (error) {
    const cached = readCachedPlaylist();
    if (cached?.length) {
      return {
        videos: normalizeVideos(cached),
        source: "cache",
      };
    }

    const fallback = normalizeVideos(sisterBadiaVideos);
    if (fallback.length) {
      return {
        videos: fallback,
        source: "fallback",
      };
    }

    throw new Error(
      error?.message ||
        "The video sessions could not be loaded inside Marakah. You can still open the original playlist on YouTube.",
    );
  }
}

export { SISTER_BADIA_PLAYLIST_URL };
