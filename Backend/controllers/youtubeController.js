const {
  PLAYLIST_ID,
  getSisterBadiaPlaylist,
} = require("../services/youtubePlaylistService");

async function getSisterBadiaPlaylistController(req, res) {
  const result = await getSisterBadiaPlaylist();

  if (!result.ok) {
    return res.status(result.status || 500).json({
      success: false,
      message: result.message || "The video series is temporarily unavailable.",
      videos: [],
      playlistId: PLAYLIST_ID,
    });
  }

  return res.status(200).json({
    success: true,
    playlistId: PLAYLIST_ID,
    videos: result.videos,
    fromCache: Boolean(result.fromCache),
  });
}

module.exports = {
  getSisterBadiaPlaylistController,
};
