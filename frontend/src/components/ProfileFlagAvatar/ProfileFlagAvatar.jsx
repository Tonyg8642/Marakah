import { useEffect, useMemo, useState } from "react";
import { getUserFlag } from "../../utils/getUserFlag";
import "./ProfileFlagAvatar.css";

const VARIANT_DIMENSIONS = {
  profile: {
    containerWidth: 220,
    containerHeight: 180,
    flagWidth: 210,
    flagHeight: 125,
    avatarSize: 115,
    waveDepth: "2.1deg",
    waveSkew: "0.8deg",
    waveLift: "1.2px",
    waveStretch: "0.008",
    waveDuration: "10.2s",
  },
  card: {
    containerWidth: 120,
    containerHeight: 102,
    flagWidth: 112,
    flagHeight: 72,
    avatarSize: 64,
    waveDepth: "1.7deg",
    waveSkew: "0.6deg",
    waveLift: "0.8px",
    waveStretch: "0.006",
    waveDuration: "9.4s",
  },
  compact: {
    containerWidth: 58,
    containerHeight: 52,
    flagWidth: 56,
    flagHeight: 36,
    avatarSize: 38,
    waveDepth: "1.2deg",
    waveSkew: "0.45deg",
    waveLift: "0.45px",
    waveStretch: "0.004",
    waveDuration: "8.6s",
  },
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getInitial(userName) {
  const safe = String(userName || "").trim();
  return safe ? safe.charAt(0).toUpperCase() : "M";
}

function getCleanFlagUrls(flagUrls, fallbackFlag) {
  const candidates = Array.isArray(flagUrls)
    ? flagUrls
    : [fallbackFlag].filter(Boolean);

  const deduped = [];
  for (const candidate of candidates) {
    const next = String(candidate || "").trim();
    if (!next || deduped.includes(next)) {
      continue;
    }
    deduped.push(next);
  }

  return deduped;
}

function getFlagSlots(flags) {
  if (flags.length <= 1) {
    return flags.map((src, index) => ({
      key: `${src}-${index}`,
      src,
      left: 0,
      top: 0,
      width: 100,
      height: 100,
      variant: "single",
    }));
  }

  if (flags.length === 2) {
    return [
      {
        key: `${flags[0]}-left`,
        src: flags[0],
        left: 0,
        top: 0,
        width: 50,
        height: 100,
        variant: "split-left",
      },
      {
        key: `${flags[1]}-right`,
        src: flags[1],
        left: 50,
        top: 0,
        width: 50,
        height: 100,
        variant: "split-right",
      },
    ];
  }

  const [primaryLeft, primaryRight, ...rest] = flags;
  const slots = [
    {
      key: `${primaryLeft}-left`,
      src: primaryLeft,
      left: 0,
      top: 0,
      width: 40,
      height: 100,
      variant: "stack-left",
    },
    {
      key: `${primaryRight}-middle`,
      src: primaryRight,
      left: 40,
      top: 0,
      width: 40,
      height: 100,
      variant: "stack-middle",
    },
  ];

  const stripeHeight = 100 / rest.length;
  rest.forEach((src, index) => {
    slots.push({
      key: `${src}-stripe-${index}`,
      src,
      left: 80,
      top: stripeHeight * index,
      width: 20,
      height: stripeHeight,
      variant: "stack-stripe",
    });
  });

  return slots;
}

export default function ProfileFlagAvatar({
  avatarUrl,
  userName,
  avatarAlt,
  country,
  ethnicity,
  flagUrl,
  flagUrls,
  size,
  variant = "profile",
  animated = true,
  className = "",
}) {
  const safeVariant = VARIANT_DIMENSIONS[variant] ? variant : "profile";
  const base = VARIANT_DIMENSIONS[safeVariant];
  const numericSize = Number(size);
  const hasSizeOverride = Number.isFinite(numericSize) && numericSize > 0;
  const scale = hasSizeOverride
    ? clamp(numericSize / base.avatarSize, 0.62, 2.4)
    : 1;

  const [didAvatarFail, setDidAvatarFail] = useState(false);
  const [failedFlagUrls, setFailedFlagUrls] = useState(() => new Set());

  const resolvedFlag = useMemo(
    () => getUserFlag({ flagUrl, country, ethnicity }),
    [country, ethnicity, flagUrl],
  );
  const allFlagUrls = useMemo(
    () => getCleanFlagUrls(flagUrls, resolvedFlag),
    [flagUrls, resolvedFlag],
  );
  const visibleFlagUrls = useMemo(
    () => allFlagUrls.filter((url) => !failedFlagUrls.has(url)),
    [allFlagUrls, failedFlagUrls],
  );
  const flagSlots = useMemo(
    () => getFlagSlots(visibleFlagUrls),
    [visibleFlagUrls],
  );
  const safeAvatarUrl = String(avatarUrl || "").trim();
  const hasAvatarImage = Boolean(safeAvatarUrl) && !didAvatarFail;
  const hasFlagImage = flagSlots.length > 0;
  const safeName = String(userName || "").trim() || "User";
  const profileAlt =
    typeof avatarAlt === "string" && avatarAlt.trim()
      ? avatarAlt.trim()
      : `${safeName}'s profile`;

  useEffect(() => {
    setDidAvatarFail(false);
  }, [safeAvatarUrl]);

  useEffect(() => {
    setFailedFlagUrls(new Set());
  }, [allFlagUrls.join("|")]);

  const style = {
    "--pfa-container-width": `${Math.round(base.containerWidth * scale)}px`,
    "--pfa-container-height": `${Math.round(base.containerHeight * scale)}px`,
    "--pfa-flag-width": `${Math.round(base.flagWidth * scale)}px`,
    "--pfa-flag-height": `${Math.round(base.flagHeight * scale)}px`,
    "--pfa-avatar-size": `${Math.round(base.avatarSize * scale)}px`,
    "--pfa-wave-depth": base.waveDepth,
    "--pfa-wave-skew": base.waveSkew,
    "--pfa-wave-lift": base.waveLift,
    "--pfa-wave-stretch": base.waveStretch,
    "--pfa-wave-duration": base.waveDuration,
  };

  return (
    <div
      className={[
        "profile-flag-avatar",
        `profile-flag-avatar--${safeVariant}`,
        hasFlagImage ? "profile-flag-avatar--has-flag" : "",
        flagSlots.length === 2 ? "profile-flag-avatar--split" : "",
        flagSlots.length > 2 ? "profile-flag-avatar--blend" : "",
        animated ? "" : "profile-flag-avatar--static",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={style}
    >
      <div className="profile-flag-avatar__flag-shell" aria-hidden="true">
        <div className="profile-flag-avatar__flag-wrapper">
          {flagSlots.map((slot) => (
            <span
              key={slot.key}
              className={`profile-flag-avatar__slot profile-flag-avatar__slot--${slot.variant}`}
              style={{
                left: `${slot.left}%`,
                top: `${slot.top}%`,
                width: `${slot.width}%`,
                height: `${slot.height}%`,
              }}
            >
              <img
                className="profile-flag-avatar__flag"
                src={slot.src}
                alt=""
                aria-hidden="true"
                loading="lazy"
                decoding="async"
                onError={() => {
                  setFailedFlagUrls((current) => {
                    if (current.has(slot.src)) {
                      return current;
                    }

                    const next = new Set(current);
                    next.add(slot.src);
                    return next;
                  });
                }}
              />
            </span>
          ))}
          <span className="profile-flag-avatar__flag-fallback" />
        </div>
        <div className="profile-flag-avatar__overlay" />
      </div>

      <div className="profile-flag-avatar__photo-shell">
        {hasAvatarImage ? (
          <img
            className="profile-flag-avatar__photo"
            src={safeAvatarUrl}
            alt={profileAlt}
            onError={() => setDidAvatarFail(true)}
          />
        ) : (
          <span className="profile-flag-avatar__initial" aria-hidden="true">
            {getInitial(safeName)}
          </span>
        )}
      </div>
    </div>
  );
}
