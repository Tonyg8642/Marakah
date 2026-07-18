import { useMemo, useRef } from "react";
import ProfileFlagAvatar from "../ProfileFlagAvatar/ProfileFlagAvatar";
import { getUserFlag } from "../../utils/getUserFlag";
import "./HeritageAvatar.css";

const SIZE_TO_VARIANT = {
  small: "compact",
  medium: "card",
  large: "profile",
};

function getDisplayLabel(identity) {
  if (typeof identity === "string") {
    return identity.trim();
  }

  if (!identity || typeof identity !== "object") {
    return "";
  }

  return String(
    identity.displayName ||
      identity.name ||
      identity.communityName ||
      identity.country ||
      identity.ethnicity ||
      identity.id ||
      "",
  ).trim();
}

function toNeutralSymbol(identity) {
  if (typeof identity === "string") {
    return "ID";
  }

  const explicit = String(identity?.badgeText || identity?.symbol || "").trim();
  if (explicit) {
    return explicit;
  }

  const label = getDisplayLabel(identity);
  if (!label) {
    return "ID";
  }

  const parts = label.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

function resolveIdentity(identity) {
  if (typeof identity === "string") {
    return {
      id: identity,
      label: identity.trim(),
      flagUrl: getUserFlag({ country: identity, ethnicity: identity }),
      isFlag: Boolean(getUserFlag({ country: identity, ethnicity: identity })),
      neutralSymbol: "",
    };
  }

  const label = getDisplayLabel(identity);
  const explicitFlag = String(
    identity?.flagUrl || identity?.assetPath || "",
  ).trim();
  const mappedFlag = getUserFlag({
    flagUrl: explicitFlag,
    country: identity?.country,
    ethnicity: identity?.ethnicity || label,
  });
  const visualType = String(
    identity?.visualType || identity?.symbolType || "",
  ).trim();
  const isExplicitNeutral = visualType === "badge" || visualType === "neutral";
  const isFlag = Boolean(mappedFlag) && !isExplicitNeutral;

  return {
    id: String(identity?.id || label || "identity").trim(),
    label,
    flagUrl: isFlag ? mappedFlag : "",
    isFlag,
    neutralSymbol: isFlag ? "" : toNeutralSymbol(identity),
  };
}

export default function HeritageAvatar({
  profileImageUrl,
  avatarUrl,
  userName,
  avatarAlt,
  identities = [],
  size = "large",
  animated = true,
  editable = false,
  onUpload,
  onRemove,
  className = "",
  uploadLabel = "Upload image",
  removeLabel = "Remove image",
  ariaLabel,
}) {
  const fileInputRef = useRef(null);
  const safeVariant = SIZE_TO_VARIANT[size] || "profile";
  const normalizedIdentities = useMemo(
    () =>
      Array.isArray(identities)
        ? identities.filter(Boolean).map(resolveIdentity)
        : [],
    [identities],
  );

  const flagUrls = normalizedIdentities
    .filter((item) => item.isFlag && item.flagUrl)
    .map((item) => item.flagUrl);
  const neutralBadges = normalizedIdentities
    .filter((item) => !item.isFlag)
    .map((item) => ({
      id: item.id,
      symbol: item.neutralSymbol || "ID",
      label: item.label || "Identity",
    }));

  const imageUrl = String(profileImageUrl || avatarUrl || "").trim();
  const combinedIdentityLabel = normalizedIdentities.length
    ? normalizedIdentities.map((item) => item.label || "Identity").join(", ")
    : "No identity selected";
  const computedAriaLabel =
    typeof ariaLabel === "string" && ariaLabel.trim()
      ? ariaLabel.trim()
      : `${String(userName || "User").trim() || "User"} heritage avatar: ${combinedIdentityLabel}`;

  function handleUploadClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0] || null;
    if (file && typeof onUpload === "function") {
      onUpload(file);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <div
      className={[
        "heritage-avatar",
        `heritage-avatar--${safeVariant}`,
        editable ? "heritage-avatar--editable" : "heritage-avatar--display",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role="group"
      aria-label={computedAriaLabel}
    >
      <ProfileFlagAvatar
        avatarUrl={imageUrl}
        userName={userName}
        avatarAlt={avatarAlt}
        flagUrls={flagUrls}
        variant={safeVariant}
        animated={animated}
        className="heritage-avatar__visual"
      />

      {neutralBadges.length ? (
        <div className="heritage-avatar__neutral-list" aria-hidden="true">
          {neutralBadges.slice(0, 3).map((badge) => (
            <span
              key={badge.id}
              className="heritage-avatar__neutral-badge"
              title={badge.label}
            >
              {badge.symbol}
            </span>
          ))}
        </div>
      ) : null}

      {editable ? (
        <div className="heritage-avatar__controls">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            aria-label="Choose a profile photo"
            onChange={handleFileChange}
          />
          <button
            type="button"
            className="btn-secondary"
            onClick={handleUploadClick}
          >
            {uploadLabel}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              if (typeof onRemove === "function") {
                onRemove();
              }
            }}
            disabled={!imageUrl}
          >
            {removeLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
