import { useEffect, useMemo, useRef, useState } from "react";
import SisterBadiaSessionCard from "./SisterBadiaSessionCard";
import SisterBadiaVideoPlayer from "./SisterBadiaVideoPlayer";
import {
  fetchSisterBadiaPlaylist,
  SISTER_BADIA_PLAYLIST_URL,
} from "../../services/sisterBadiaPlaylistApi";
import "./SisterBadiaVideoSeries.css";

export default function SisterBadiaVideoSeries() {
  const playerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [videos, setVideos] = useState([]);
  const [selectedVideoId, setSelectedVideoId] = useState("");

  const selectedVideo = useMemo(
    () =>
      videos.find((video) => video.id === selectedVideoId) || videos[0] || null,
    [selectedVideoId, videos],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadPlaylist() {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const payload = await fetchSisterBadiaPlaylist();
        if (cancelled) {
          return;
        }

        const loadedVideos = Array.isArray(payload?.videos)
          ? payload.videos
          : [];
        setVideos(loadedVideos);
        setSelectedVideoId(loadedVideos[0]?.id || "");
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error?.message ||
              "The video sessions could not be loaded inside Marakah. You can still open the original playlist on YouTube.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadPlaylist();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleSelectVideo(videoId) {
    setSelectedVideoId(videoId);
    if (
      playerRef.current &&
      typeof playerRef.current.scrollIntoView === "function"
    ) {
      playerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <section
      className="sister-badia-series"
      aria-labelledby="sister-badia-series-title"
    >
      <header className="sister-badia-series__header">
        <h2 id="sister-badia-series-title">
          Learn How to Read the Quran by Sister Badia Khazaal
        </h2>
        <p>
          Select a session below to watch Sister Badia Khazaal’s step-by-step
          Quran-reading lessons.
        </p>
      </header>

      {isLoading ? (
        <p className="sister-badia-series__status">Loading video sessions…</p>
      ) : null}

      {!isLoading && errorMessage ? (
        <div className="sister-badia-series__status" role="alert">
          <p>
            The video sessions could not be loaded inside Marakah. You can still
            open the original playlist on YouTube.
          </p>
          <a
            href={SISTER_BADIA_PLAYLIST_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open Full Playlist on YouTube (opens in new tab)
          </a>
        </div>
      ) : null}

      {!isLoading && !errorMessage && !videos.length ? (
        <p className="sister-badia-series__status">
          No video sessions are currently available.
        </p>
      ) : null}

      {!isLoading && !errorMessage && videos.length ? (
        <>
          <div ref={playerRef}>
            <SisterBadiaVideoPlayer selectedVideo={selectedVideo} />
          </div>

          <h3 className="sister-badia-series__sessions-title">All Sessions</h3>
          <div className="sister-badia-series__sessions">
            {videos.map((video) => (
              <SisterBadiaSessionCard
                key={video.id}
                video={video}
                isSelected={selectedVideo?.id === video.id}
                onSelect={() => handleSelectVideo(video.id)}
              />
            ))}
          </div>

          <footer className="sister-badia-series__footer">
            <a
              href={SISTER_BADIA_PLAYLIST_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open Full Playlist on YouTube (opens in new tab)
            </a>
            <p>
              These lessons are taught by Sister Badia Khazaal and are embedded
              from their original YouTube source. Marakah does not own,
              download, copy, host, or re-upload these videos.
            </p>
          </footer>
        </>
      ) : null}
    </section>
  );
}
