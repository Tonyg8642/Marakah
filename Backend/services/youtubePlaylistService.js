const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3/playlistItems";
const PLAYLIST_ID = "PLZ8YzLCrJd8ZPOBcs6Fk2PcPUFFPlxnqh";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

let cachedPayload = null;
let cachedAt = 0;

function hasFreshCache() {
  return cachedPayload && Date.now() - cachedAt < CACHE_TTL_MS;
}

function normalizeItem(item) {
  const snippet = item?.snippet || {};
  const status = item?.status || {};
  const resource = snippet?.resourceId || {};
  const videoId = String(resource?.videoId || "").trim();
  const title = String(snippet?.title || "").trim();

  if (!videoId) {
    return null;
  }

  if (status?.privacyStatus === "private") {
    return null;
  }

  const lowerTitle = title.toLowerCase();
  if (lowerTitle === "private video" || lowerTitle === "deleted video") {
    return null;
  }

  const thumbnails = snippet?.thumbnails || {};
  const thumbnailUrl =
    thumbnails?.high?.url ||
    thumbnails?.medium?.url ||
    thumbnails?.default?.url ||
    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  return {
    id: videoId,
    sessionNumber: Number(snippet?.position || 0) + 1,
    title,
    teacher: String(
      snippet?.videoOwnerChannelTitle ||
        snippet?.channelTitle ||
        "Sister Badia Khazaal",
    ).trim(),
    youtubeVideoId: videoId,
    youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
    thumbnailUrl,
    playlistPosition: Number(snippet?.position || 0),
    publishedAt: snippet?.publishedAt || null,
  };
}

async function fetchPlaylistPage({ apiKey, pageToken = "" }) {
  const params = new URLSearchParams({
    part: "snippet,status,contentDetails",
    maxResults: "50",
    playlistId: PLAYLIST_ID,
    key: apiKey,
  });

  if (pageToken) {
    params.set("pageToken", pageToken);
  }

  const response = await fetch(`${YOUTUBE_API_BASE}?${params.toString()}`, {
    headers: {
      Accept: "application/json",
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const safeMessage = String(
      payload?.error?.message || "YouTube API request failed.",
    );
    const error = new Error(safeMessage);
    error.status = response.status;
    throw error;
  }

  return payload;
}

async function fetchAllPlaylistVideos(apiKey) {
  const videos = [];
  let nextPageToken = "";

  do {
    const page = await fetchPlaylistPage({
      apiKey,
      pageToken: nextPageToken,
    });

    const items = Array.isArray(page?.items) ? page.items : [];
    items.forEach((item) => {
      const normalized = normalizeItem(item);
      if (normalized) {
        videos.push(normalized);
      }
    });

    nextPageToken = String(page?.nextPageToken || "").trim();
  } while (nextPageToken);

  return videos.sort((a, b) => a.playlistPosition - b.playlistPosition);
}

async function getSisterBadiaPlaylist() {
  const apiKey = String(process.env.YOUTUBE_API_KEY || "").trim();
  if (!apiKey) {
    return {
      ok: false,
      status: 503,
      message: "The video series is temporarily unavailable.",
      videos: [],
    };
  }

  if (hasFreshCache()) {
    return {
      ok: true,
      status: 200,
      videos: cachedPayload,
      fromCache: true,
    };
  }

  try {
    const videos = await fetchAllPlaylistVideos(apiKey);
    cachedPayload = videos;
    cachedAt = Date.now();

    return {
      ok: true,
      status: 200,
      videos,
      fromCache: false,
    };
  } catch (error) {
    if (cachedPayload) {
      return {
        ok: true,
        status: 200,
        videos: cachedPayload,
        fromCache: true,
      };
    }

    return {
      ok: false,
      status: 502,
      message: "The video series is temporarily unavailable.",
      videos: [],
    };
  }
}

module.exports = {
  PLAYLIST_ID,
  getSisterBadiaPlaylist,
};
