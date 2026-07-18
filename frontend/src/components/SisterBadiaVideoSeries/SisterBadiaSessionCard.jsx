import { useState } from "react";

export default function SisterBadiaSessionCard({
  video,
  isSelected,
  onSelect,
}) {
  const [isThumbErrored, setIsThumbErrored] = useState(false);

  return (
    <button
      type="button"
      className={`sister-badia-series__session-card ${isSelected ? "is-selected" : ""}`}
      onClick={onSelect}
      aria-current={isSelected ? "true" : undefined}
    >
      <div className="sister-badia-series__thumb-wrap">
        {!isThumbErrored ? (
          <img
            src={video.thumbnailUrl}
            alt={`Thumbnail for Session ${video.sessionNumber}: ${video.title}`}
            loading="lazy"
            onError={() => setIsThumbErrored(true)}
          />
        ) : (
          <div
            className="sister-badia-series__thumb-fallback"
            role="img"
            aria-label={`Session ${video.sessionNumber}`}
          >
            Session {video.sessionNumber}
          </div>
        )}
        <span className="sister-badia-series__play-badge" aria-hidden="true">
          ▶
        </span>
      </div>

      <div className="sister-badia-series__session-meta">
        <p className="sister-badia-series__session-number">
          Session {video.sessionNumber}
        </p>
        <h4>{video.title}</h4>
        <p>{video.teacher}</p>
        <span className="sister-badia-series__watch-label">Watch Session</span>
        {isSelected ? (
          <span className="sister-badia-series__now-playing">Now Playing</span>
        ) : null}
      </div>
    </button>
  );
}
