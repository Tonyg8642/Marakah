export default function SisterBadiaVideoPlayer({ selectedVideo }) {
  if (!selectedVideo) {
    return null;
  }

  return (
    <section className="sister-badia-series__player-wrap" aria-live="polite">
      <p className="sister-badia-series__session-label">
        Session {selectedVideo.sessionNumber}
      </p>
      <h3 className="sister-badia-series__player-title">
        {selectedVideo.title}
      </h3>
      <p className="sister-badia-series__teacher">
        Taught by Sister Badia Khazaal
      </p>

      <div className="sister-badia-series__player-shell">
        <iframe
          className="sister-badia-series__player"
          src={`https://www.youtube-nocookie.com/embed/${selectedVideo.youtubeVideoId}`}
          title={`Sister Badia Khazaal Session ${selectedVideo.sessionNumber}: ${selectedVideo.title}`}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>

      <a
        href={selectedVideo.youtubeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="sister-badia-series__youtube-link"
      >
        Watch This Session on YouTube (opens in new tab)
      </a>
    </section>
  );
}
