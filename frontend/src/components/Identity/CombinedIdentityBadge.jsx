import { useMemo, useState } from "react";
import "./CombinedIdentityBadge.css";

function getShortLabel(option) {
  if (option?.badgeText) {
    return option.badgeText;
  }

  const label = String(option?.displayName || option?.name || "ID").trim();
  if (!label) {
    return "ID";
  }

  const parts = label.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 3).toUpperCase();
  }

  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

function getObjectPosition(option, side) {
  const optionId = String(option?.id || "").toLowerCase();

  if (optionId === "mexican") {
    return "50% 50%";
  }

  if (optionId === "puerto-rican") {
    return "16% 50%";
  }

  return side === "left" ? "46% 50%" : "54% 50%";
}

function IdentityHalf({ option, side, onImageError, failedImageIds }) {
  const imageFailed = failedImageIds.has(option.id);
  const canUseImage =
    option.visualType === "flag" && option.assetPath && !imageFailed;

  return (
    <span className={`combined-identity-half combined-identity-half--${side}`}>
      {canUseImage ? (
        <img
          src={option.assetPath}
          alt={option.accessibilityLabel || `${option.displayName} flag`}
          style={{ objectPosition: getObjectPosition(option, side) }}
          onError={() => onImageError(option.id)}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <span className="combined-identity-half-badge">
          {getShortLabel(option)}
        </span>
      )}
    </span>
  );
}

export default function CombinedIdentityBadge({
  selectedOptions,
  className = "",
  ariaLabel,
  wave = false,
}) {
  const [failedImageIds, setFailedImageIds] = useState(() => new Set());

  const visibleOptions = useMemo(
    () =>
      Array.isArray(selectedOptions) ? selectedOptions.filter(Boolean) : [],
    [selectedOptions],
  );

  const primary = visibleOptions[0] || null;
  const secondary = visibleOptions[1] || null;
  const extraCount = Math.max(0, visibleOptions.length - 2);

  const computedAriaLabel = useMemo(() => {
    if (ariaLabel) {
      return ariaLabel;
    }

    if (!primary) {
      return "No identities selected";
    }

    if (!secondary) {
      return `${primary.displayName} identity selected`;
    }

    const base = `${primary.displayName} and ${secondary.displayName} shown as a 50/50 combined identity badge`;
    if (extraCount > 0) {
      return `${base}, plus ${extraCount} additional selected identities`;
    }

    return base;
  }, [ariaLabel, extraCount, primary, secondary]);

  function handleImageError(optionId) {
    setFailedImageIds((current) => {
      if (current.has(optionId)) {
        return current;
      }
      const next = new Set(current);
      next.add(optionId);
      return next;
    });
  }

  if (!primary) {
    return (
      <span
        className={`combined-identity-badge ${className}`.trim()}
        aria-label={computedAriaLabel}
      >
        <span className="combined-identity-empty">ID</span>
      </span>
    );
  }

  return (
    <span
      className={`combined-identity-badge${wave ? " combined-identity-badge--wave" : ""} ${className}`.trim()}
      aria-label={computedAriaLabel}
    >
      <IdentityHalf
        option={primary}
        side="left"
        onImageError={handleImageError}
        failedImageIds={failedImageIds}
      />
      {secondary ? (
        <>
          <span className="combined-identity-divider" aria-hidden="true" />
          <IdentityHalf
            option={secondary}
            side="right"
            onImageError={handleImageError}
            failedImageIds={failedImageIds}
          />
        </>
      ) : null}
      {extraCount > 0 ? (
        <span
          className="combined-identity-extra"
          aria-label={`${extraCount} additional selected identities`}
        >
          +{extraCount}
        </span>
      ) : null}
    </span>
  );
}
