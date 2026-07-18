import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ActivityCard from "./components/ActivityCard";
import PhotoCard from "./components/PhotoCard";
import ProfileStatCard from "./components/ProfileStatCard";
import ReminderCard from "./components/ReminderCard";
import CombinedIdentityBadge from "../../components/Identity/CombinedIdentityBadge";
import HeritageAvatar from "../../components/HeritageAvatar/HeritageAvatar";
import { useLanguagePreference } from "../../contexts/LanguageContext";
import {
  fetchIdentityPreference,
  saveIdentityPreference,
} from "../../services/identityPreferenceApi";
import {
  fetchProfileImage,
  fetchProfileStats,
  removeProfileImage,
  uploadProfileImage,
} from "./profileApi";
import {
  COLLECTIONS,
  createProfileUserKey,
  readCollection,
  readStoredObject,
  removeStoredValue,
  writeCollection,
  writeStoredObject,
} from "./profileStorage";
import {
  IDENTITY_OPTION_IDS,
  OTHER_IDENTITY_ID,
  PREFER_NOT_TO_SAY_ID,
  PROFILE_FLAG_OPTIONS_BY_ID,
  PROFILE_SPLIT_DIRECTIONS,
} from "./countryFlagConfig";
import {
  getDefaultIdentityDraft,
  getDefaultProfileIdentityPreference,
  getFlagLayersFromPreference,
  getIdentityDraftFromPreference,
  getPreferenceFromIdentityDraft,
  sanitizeProfileIdentityPreference,
  validateIdentityDraft,
} from "./profileIdentityPreference";
import {
  getLanguageSupportSummary,
  rankLanguageCatalog,
} from "../../utils/languageCatalogSearch";
import "./Profile.css";

const NAME_KEY = "marakah_user_name";
const STATS_STATUS = {
  LOADING: "loading",
  SUCCESS: "success",
  EMPTY: "empty",
  ERROR: "error",
};

const SAVED_EVENTS_KEY = "marakah_saved_events_v1";
const EVENTS_CATALOG = {
  "event-family-halaqah": {
    id: "event-family-halaqah",
    name: "Family Halaqah",
    date: "Jul 18, 2026",
    venue: "Main Hall",
  },
  "event-youth-night": {
    id: "event-youth-night",
    name: "Youth Night",
    date: "Jul 20, 2026",
    venue: "Community Center",
  },
  "event-quran-competition": {
    id: "event-quran-competition",
    name: "Qur'an Competition",
    date: "Jul 27, 2026",
    venue: "Masjid Al-Noor",
  },
};

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function getIdentityShortLabel(option) {
  if (option?.badgeText) {
    return option.badgeText;
  }

  const label = String(option?.displayName || "ID").trim();
  if (!label) {
    return "ID";
  }

  const parts = label.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 3).toUpperCase();
  }

  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

function makeId(prefix) {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function getDefaultActivityForm() {
  return {
    title: "",
    speaker: "",
    venue: "",
    dateAttended: "",
    notes: "",
    eventType: "",
    photoDataUrl: "",
    photoAlt: "",
  };
}

function getDefaultPhotoForm() {
  return {
    title: "",
    caption: "",
    date: "",
    relatedActivityId: "",
    imageDataUrl: "",
    imageAlt: "",
    fileName: "",
    fileType: "",
    fileSizeBytes: 0,
    storageProvider: "temporary-localstorage",
    storagePath: "",
  };
}

function getDefaultReminderForm() {
  return {
    title: "",
    text: "",
    category: "",
    source: "",
    note: "",
    dateSaved: "",
    isPinned: false,
  };
}

function getDefaultProfileDetails(displayName) {
  return {
    displayName: String(displayName || "").trim() || "Guest",
    username: "",
    bio: "",
    joinDateLabel: "",
  };
}

function sanitizeProfileDetails(rawValue, fallbackDisplayName) {
  const defaults = getDefaultProfileDetails(fallbackDisplayName);
  if (!rawValue || typeof rawValue !== "object" || Array.isArray(rawValue)) {
    return defaults;
  }

  return {
    displayName:
      String(rawValue.displayName || "").trim() || defaults.displayName,
    username: String(rawValue.username || "")
      .trim()
      .replace(/^@+/, ""),
    bio: String(rawValue.bio || "").trim(),
    joinDateLabel: String(rawValue.joinDateLabel || "").trim(),
  };
}

function sanitizeProfileAvatar(rawValue) {
  if (!rawValue || typeof rawValue !== "object" || Array.isArray(rawValue)) {
    return null;
  }

  const imageDataUrl = String(rawValue.imageDataUrl || "").trim();
  const imageUrl = String(rawValue.imageUrl || "").trim();
  const fileType = String(rawValue.fileType || "").trim();
  const fileName = String(rawValue.fileName || "").trim();
  const fileSizeBytes = Number(rawValue.fileSizeBytes) || 0;
  const storageProvider = String(rawValue.storageProvider || "").trim();
  const storagePath = String(rawValue.storagePath || "").trim();

  if (!fileType.startsWith("image/")) {
    return null;
  }

  const hasDataUrl = imageDataUrl.startsWith("data:image/");
  const hasRemoteUrl =
    imageUrl.startsWith("http://") || imageUrl.startsWith("https://");
  if (!hasDataUrl && !hasRemoteUrl) {
    return null;
  }

  return {
    imageDataUrl: hasDataUrl ? imageDataUrl : "",
    imageUrl: hasRemoteUrl ? imageUrl : "",
    fileType,
    fileName,
    fileSizeBytes,
    storageProvider: storageProvider || "temporary-localstorage",
    storagePath,
    updatedAt: String(rawValue.updatedAt || "") || new Date().toISOString(),
  };
}

function readSavedEventIds() {
  try {
    const raw = localStorage.getItem(SAVED_EVENTS_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item) => typeof item === "string");
  } catch {
    return [];
  }
}

function getStatusForStat(status, value, emptyText, loadingText, errorText) {
  if (status === STATS_STATUS.LOADING) {
    return { value: "—", statusText: loadingText };
  }

  if (status === STATS_STATUS.ERROR) {
    return { value: "—", statusText: errorText };
  }

  if (status === STATS_STATUS.EMPTY || value === null || value === undefined) {
    return { value: "—", statusText: emptyText };
  }

  if (typeof value === "number" && value === 0) {
    return { value: "0", statusText: emptyText };
  }

  return { value: String(value), statusText: "" };
}

function formatStreakValue(value, t) {
  if (typeof value === "number") {
    return t("profile.stats.days", { count: value });
  }

  return value;
}

function sortReminders(items) {
  return [...items].sort((a, b) => {
    if (a.isPinned && !b.isPinned) {
      return -1;
    }
    if (!a.isPinned && b.isPinned) {
      return 1;
    }

    return String(b.dateSaved || "").localeCompare(String(a.dateSaved || ""));
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Could not read image data."));
    };
    reader.onerror = () => {
      reject(new Error("Could not read the selected image. Please try again."));
    };
    reader.readAsDataURL(file);
  });
}

function FlagBackground({ preference, className, failedImageIds }) {
  const { preference: safePreference, layers } =
    getFlagLayersFromPreference(preference);

  if (layers.length === 0) {
    return null;
  }

  const isVertical =
    safePreference.splitDirection !== PROFILE_SPLIT_DIRECTIONS.HORIZONTAL;
  const portion = 100 / layers.length;

  return (
    <div className={className} aria-hidden="true">
      {layers.map((option, index) => {
        const imageFailed = failedImageIds?.has(option.id);
        const style = isVertical
          ? {
              "--profile-flag-image": imageFailed
                ? "none"
                : `url(${option.assetPath})`,
              "--profile-flag-width": `${portion}%`,
              "--profile-flag-left": `${portion * index}%`,
              "--profile-flag-height": "100%",
              "--profile-flag-top": "0%",
              "--profile-flag-wave-delay": `${index * -0.6}s`,
              "--profile-flag-wave-speed": `${13 + index * 1.4}s`,
            }
          : {
              "--profile-flag-image": imageFailed
                ? "none"
                : `url(${option.assetPath})`,
              "--profile-flag-width": "100%",
              "--profile-flag-left": "0%",
              "--profile-flag-height": `${portion}%`,
              "--profile-flag-top": `${portion * index}%`,
              "--profile-flag-wave-delay": `${index * -0.6}s`,
              "--profile-flag-wave-speed": `${13 + index * 1.4}s`,
            };

        return (
          <span
            key={`${option.id}-${index}`}
            className={`profile-flag-layer${imageFailed ? " profile-flag-layer--fallback" : ""}`}
            style={style}
          >
            {imageFailed ? (
              <span className="profile-flag-fallback-text" aria-hidden="true">
                {getIdentityShortLabel(option)}
              </span>
            ) : null}
          </span>
        );
      })}
      <span className="profile-flag-overlay" />
    </div>
  );
}

export default function Profile() {
  const { t } = useTranslation();
  const {
    language,
    resolvedInterfaceTag,
    interfaceResolution,
    changeLanguage,
    isSaving,
    selectableLanguages,
  } = useLanguagePreference();
  const [statsStatus, setStatsStatus] = useState(STATS_STATUS.LOADING);
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState("");

  const [activities, setActivities] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [isCollectionsReady, setIsCollectionsReady] = useState(false);

  const [activeModal, setActiveModal] = useState("");
  const [editingId, setEditingId] = useState("");
  const [formError, setFormError] = useState("");

  const [activityForm, setActivityForm] = useState(getDefaultActivityForm);
  const [photoForm, setPhotoForm] = useState(getDefaultPhotoForm);
  const [photoUploadError, setPhotoUploadError] = useState("");
  const [selectedPhotoFile, setSelectedPhotoFile] = useState(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState("");
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);
  const [reminderForm, setReminderForm] = useState(getDefaultReminderForm);
  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [languageSearchQuery, setLanguageSearchQuery] = useState("");
  const [savedIdentityPreference, setSavedIdentityPreference] = useState(
    getDefaultProfileIdentityPreference,
  );
  const [identityDraft, setIdentityDraft] = useState(getDefaultIdentityDraft);
  const [identityError, setIdentityError] = useState("");
  const [identityNotice, setIdentityNotice] = useState("");
  const [identitySearchQuery, setIdentitySearchQuery] = useState("");
  const [isIdentityListExpanded, setIsIdentityListExpanded] = useState(true);
  const [failedIdentityImageIds, setFailedIdentityImageIds] = useState(
    () => new Set(),
  );
  const [savedEventIds, setSavedEventIds] = useState([]);
  const [profileDetails, setProfileDetails] = useState(() =>
    getDefaultProfileDetails("Guest"),
  );
  const [profileDetailsDraft, setProfileDetailsDraft] = useState(() =>
    getDefaultProfileDetails("Guest"),
  );
  const [isEditingProfileDetails, setIsEditingProfileDetails] = useState(false);
  const [profileAvatar, setProfileAvatar] = useState(null);
  const [profileAvatarError, setProfileAvatarError] = useState("");
  const [profileAvatarNotice, setProfileAvatarNotice] = useState("");
  const [isProfileAvatarUploading, setIsProfileAvatarUploading] =
    useState(false);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState("");
  const photoFileInputRef = useRef(null);
  const avatarFileInputRef = useRef(null);
  const languageSelectRef = useRef(null);
  const identityListTriggerRef = useRef(null);
  const firstIdentityCheckboxRef = useRef(null);
  const otherIdentityInputRef = useRef(null);

  const userName = useMemo(
    () =>
      localStorage.getItem(NAME_KEY) ||
      t("profile.guestName", { defaultValue: "Guest" }),
    [t],
  );
  const profileUserKey = useMemo(
    () => createProfileUserKey(userName),
    [userName],
  );

  useEffect(() => {
    let isMounted = true;

    setIsCollectionsReady(false);
    setActivities(readCollection(profileUserKey, COLLECTIONS.ACTIVITIES));
    setPhotos(readCollection(profileUserKey, COLLECTIONS.PHOTOS));
    setReminders(readCollection(profileUserKey, COLLECTIONS.REMINDERS));
    const storedIdentityPreference = readStoredObject(
      profileUserKey,
      COLLECTIONS.IDENTITY_PREFERENCE,
      getDefaultProfileIdentityPreference(),
    );
    const safeIdentityPreference = sanitizeProfileIdentityPreference(
      storedIdentityPreference,
    );
    const storedProfileDetails = sanitizeProfileDetails(
      readStoredObject(profileUserKey, COLLECTIONS.PROFILE_DETAILS, {}),
      userName,
    );
    const storedProfileAvatar = sanitizeProfileAvatar(
      readStoredObject(profileUserKey, COLLECTIONS.PROFILE_AVATAR, null),
    );

    setSavedIdentityPreference(safeIdentityPreference);
    setIdentityDraft(getIdentityDraftFromPreference(safeIdentityPreference));
    setIdentityError("");
    setIdentityNotice("");
    setProfileDetails(storedProfileDetails);
    setProfileDetailsDraft(storedProfileDetails);
    setIsEditingProfileDetails(false);
    setProfileAvatar(storedProfileAvatar);
    setProfileAvatarError("");
    setSavedEventIds(readSavedEventIds());
    setIsCollectionsReady(true);

    (async () => {
      const remoteIdentity = await fetchIdentityPreference(userName);
      if (isMounted && remoteIdentity) {
        const mergedPreference = sanitizeProfileIdentityPreference({
          ...safeIdentityPreference,
          selectedIdentityIds: remoteIdentity.ethnicityIds,
          customEthnicities: remoteIdentity.customEthnicities,
          preferNotToSay: remoteIdentity.preferNotToSay,
        });

        setSavedIdentityPreference(mergedPreference);
        setIdentityDraft(getIdentityDraftFromPreference(mergedPreference));
        writeStoredObject(
          profileUserKey,
          COLLECTIONS.IDENTITY_PREFERENCE,
          mergedPreference,
        );
      }

      const remoteProfileImage = await fetchProfileImage(userName);
      if (!isMounted || !remoteProfileImage) {
        return;
      }

      const safeRemoteAvatar = sanitizeProfileAvatar(remoteProfileImage);
      if (!safeRemoteAvatar) {
        return;
      }

      setProfileAvatar(safeRemoteAvatar);
    })();

    return () => {
      isMounted = false;
    };
  }, [profileUserKey, userName]);

  useEffect(() => {
    if (!isCollectionsReady) {
      return;
    }

    writeCollection(profileUserKey, COLLECTIONS.ACTIVITIES, activities);
  }, [activities, isCollectionsReady, profileUserKey]);

  useEffect(() => {
    if (!isCollectionsReady) {
      return;
    }

    writeCollection(profileUserKey, COLLECTIONS.PHOTOS, photos);
  }, [photos, isCollectionsReady, profileUserKey]);

  useEffect(() => {
    if (!isCollectionsReady) {
      return;
    }

    writeCollection(profileUserKey, COLLECTIONS.REMINDERS, reminders);
  }, [reminders, isCollectionsReady, profileUserKey]);

  useEffect(() => {
    if (!isCollectionsReady) {
      return;
    }

    writeStoredObject(
      profileUserKey,
      COLLECTIONS.PROFILE_DETAILS,
      profileDetails,
    );
  }, [isCollectionsReady, profileDetails, profileUserKey]);

  useEffect(() => {
    if (!isCollectionsReady) {
      return;
    }

    if (!profileAvatar) {
      removeStoredValue(profileUserKey, COLLECTIONS.PROFILE_AVATAR);
      return;
    }

    writeStoredObject(
      profileUserKey,
      COLLECTIONS.PROFILE_AVATAR,
      profileAvatar,
    );
  }, [isCollectionsReady, profileAvatar, profileUserKey]);

  useEffect(() => {
    function syncSavedEvents() {
      setSavedEventIds(readSavedEventIds());
    }

    window.addEventListener("storage", syncSavedEvents);
    window.addEventListener("focus", syncSavedEvents);

    return () => {
      window.removeEventListener("storage", syncSavedEvents);
      window.removeEventListener("focus", syncSavedEvents);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      setStatsStatus(STATS_STATUS.LOADING);
      setStatsError("");

      try {
        const result = await fetchProfileStats(profileUserKey);
        if (cancelled) {
          return;
        }

        if (!result) {
          setStats(null);
          setStatsStatus(STATS_STATUS.EMPTY);
          return;
        }

        setStats(result);
        setStatsStatus(STATS_STATUS.SUCCESS);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setStats(null);
        setStatsStatus(STATS_STATUS.ERROR);
        setStatsError(
          error.message ||
            t("profile.errors.loadStats", {
              defaultValue: "Could not load profile statistics.",
            }),
        );
      }
    }

    loadStats();

    return () => {
      cancelled = true;
    };
  }, [profileUserKey]);

  const statCards = useMemo(() => {
    const lecturesState = getStatusForStat(
      statsStatus,
      stats?.lecturesWatched,
      t("profile.stats.noActivity"),
      t("profile.stats.loading"),
      t("profile.stats.loadFailed"),
    );
    const streakState = getStatusForStat(
      statsStatus,
      typeof stats?.currentStreak === "number"
        ? formatStreakValue(stats.currentStreak, t)
        : null,
      t("profile.stats.noStreak"),
      t("profile.stats.loading"),
      t("profile.stats.loadFailed"),
    );
    const remindersState = getStatusForStat(
      statsStatus,
      stats?.savedReminders,
      t("profile.stats.noReminders"),
      t("profile.stats.loading"),
      t("profile.stats.loadFailed"),
    );

    return [
      {
        key: "lectures",
        title: t("profile.stats.lectures"),
        value: lecturesState.value,
        supportingText: t("profile.stats.completed"),
        statusText: lecturesState.statusText,
      },
      {
        key: "streak",
        title: t("profile.stats.streak"),
        value: streakState.value,
        supportingText: t("profile.stats.consistency"),
        statusText: streakState.statusText,
      },
      {
        key: "reminders",
        title: t("profile.stats.reminders"),
        value: remindersState.value,
        supportingText: t("profile.stats.active"),
        statusText: remindersState.statusText,
      },
    ];
  }, [stats, statsStatus, t]);

  const sortedReminders = useMemo(() => sortReminders(reminders), [reminders]);

  const identityPreviewPreference = useMemo(
    () => getPreferenceFromIdentityDraft(identityDraft),
    [identityDraft],
  );

  const heroFlagState = useMemo(
    () => getFlagLayersFromPreference(savedIdentityPreference),
    [savedIdentityPreference],
  );

  const previewFlagState = useMemo(
    () => getFlagLayersFromPreference(identityPreviewPreference),
    [identityPreviewPreference],
  );

  const hasUnsavedIdentityChanges = useMemo(
    () =>
      JSON.stringify(identityPreviewPreference) !==
      JSON.stringify(savedIdentityPreference),
    [identityPreviewPreference, savedIdentityPreference],
  );

  const identityOptions = useMemo(
    () =>
      IDENTITY_OPTION_IDS.map((id) => PROFILE_FLAG_OPTIONS_BY_ID[id]).filter(
        Boolean,
      ),
    [],
  );

  const normalizedIdentitySearchQuery = useMemo(
    () => identitySearchQuery.trim().toLowerCase(),
    [identitySearchQuery],
  );

  const sortedIdentityOptions = useMemo(
    () =>
      [...identityOptions].sort((a, b) =>
        String(a.displayName || "").localeCompare(String(b.displayName || "")),
      ),
    [identityOptions],
  );

  const hasExactIdentityMatch = useMemo(() => {
    if (!normalizedIdentitySearchQuery) {
      return false;
    }

    return sortedIdentityOptions.some((option) => {
      const values = [
        option.displayName,
        option.country,
        option.region,
        option.communityName,
        ...(option.alternateNames || []),
        ...(option.searchTerms || []),
      ]
        .filter(Boolean)
        .map((value) => String(value).trim().toLowerCase());

      return values.includes(normalizedIdentitySearchQuery);
    });
  }, [normalizedIdentitySearchQuery, sortedIdentityOptions]);

  const filteredIdentityOptions = useMemo(() => {
    if (!normalizedIdentitySearchQuery) {
      return sortedIdentityOptions;
    }

    const withSearchMetadata = sortedIdentityOptions
      .map((option) => {
        const searchableValues = [
          option.displayName,
          option.region,
          option.country,
          option.communityName,
          ...(option.alternateNames || []),
          ...(option.searchTerms || []),
        ]
          .filter(Boolean)
          .map((value) => String(value).toLowerCase());

        const startsWithMatch = searchableValues.some((value) =>
          value.startsWith(normalizedIdentitySearchQuery),
        );
        const includesMatch = searchableValues.some((value) =>
          value.includes(normalizedIdentitySearchQuery),
        );

        return {
          option,
          startsWithMatch,
          includesMatch,
        };
      })
      .filter((entry) => entry.includesMatch);

    const rankedMatches = withSearchMetadata
      .sort((a, b) => {
        if (a.startsWithMatch !== b.startsWithMatch) {
          return a.startsWithMatch ? -1 : 1;
        }

        return String(a.option.displayName || "").localeCompare(
          String(b.option.displayName || ""),
        );
      })
      .map((entry) => entry.option);

    const selectedSet = new Set(identityDraft.selectedIdentityIds || []);
    const mergedOptions = [];
    const seen = new Set();

    for (const option of rankedMatches) {
      if (seen.has(option.id)) {
        continue;
      }
      seen.add(option.id);
      mergedOptions.push(option);
    }

    for (const option of sortedIdentityOptions) {
      if (!selectedSet.has(option.id) || seen.has(option.id)) {
        continue;
      }
      seen.add(option.id);
      mergedOptions.push(option);
    }

    if (!hasExactIdentityMatch && !seen.has(OTHER_IDENTITY_ID)) {
      const otherOption = PROFILE_FLAG_OPTIONS_BY_ID[OTHER_IDENTITY_ID];
      if (otherOption) {
        mergedOptions.push(otherOption);
      }
    }

    return mergedOptions;
  }, [
    hasExactIdentityMatch,
    identityDraft.selectedIdentityIds,
    normalizedIdentitySearchQuery,
    sortedIdentityOptions,
  ]);

  const identityValidationMessageKey = useMemo(
    () => validateIdentityDraft(identityDraft),
    [identityDraft],
  );

  useEffect(() => {
    setSelectedLanguage(language);
  }, [language]);

  useEffect(() => {
    return () => {
      if (photoPreviewUrl) {
        URL.revokeObjectURL(photoPreviewUrl);
      }

      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl, photoPreviewUrl]);

  useEffect(() => {
    if (isIdentityListExpanded) {
      firstIdentityCheckboxRef.current?.focus();
    }
  }, [isIdentityListExpanded]);

  useEffect(() => {
    if (!identityDraft.selectedIdentityIds?.includes(OTHER_IDENTITY_ID)) {
      return;
    }

    otherIdentityInputRef.current?.focus();
  }, [identityDraft.selectedIdentityIds]);

  function clearHiddenPhotoInput() {
    if (photoFileInputRef.current) {
      photoFileInputRef.current.value = "";
    }
  }

  function clearHiddenAvatarInput() {
    if (avatarFileInputRef.current) {
      avatarFileInputRef.current.value = "";
    }
  }

  function clearAvatarPreviewUrl() {
    if (avatarPreviewUrl) {
      URL.revokeObjectURL(avatarPreviewUrl);
    }
    setAvatarPreviewUrl("");
  }

  function resetPhotoSelection() {
    if (photoPreviewUrl) {
      URL.revokeObjectURL(photoPreviewUrl);
    }

    setSelectedPhotoFile(null);
    setPhotoPreviewUrl("");
    setPhotoUploadError("");
    setIsSavingPhoto(false);
    clearHiddenPhotoInput();
  }

  function closeModal() {
    setActiveModal("");
    setEditingId("");
    setFormError("");
    resetPhotoSelection();
  }

  function openCreateActivityModal() {
    setEditingId("");
    setFormError("");
    setActivityForm(getDefaultActivityForm());
    setActiveModal("activity");
  }

  function openEditActivityModal(id) {
    const match = activities.find((item) => item.id === id);
    if (!match) {
      return;
    }

    setEditingId(id);
    setFormError("");
    setActivityForm({
      title: match.title || "",
      speaker: match.speaker || "",
      venue: match.venue || "",
      dateAttended: match.dateAttended || "",
      notes: match.notes || "",
      eventType: match.eventType || "",
      photoDataUrl: match.photoDataUrl || "",
      photoAlt: match.photoAlt || "",
    });
    setActiveModal("activity");
  }

  function handleSaveActivity(event) {
    event.preventDefault();
    if (!activityForm.title.trim()) {
      setFormError(t("profile.validation.titleRequired"));
      return;
    }

    const nextRecord = {
      id: editingId || makeId("act"),
      title: activityForm.title.trim(),
      speaker: activityForm.speaker.trim(),
      venue: activityForm.venue.trim(),
      dateAttended: activityForm.dateAttended,
      notes: activityForm.notes.trim(),
      eventType: activityForm.eventType.trim(),
      photoDataUrl: activityForm.photoDataUrl.trim(),
      photoAlt: activityForm.photoAlt.trim(),
      userKey: profileUserKey,
      updatedAt: new Date().toISOString(),
    };

    setActivities((current) => {
      if (!editingId) {
        return [nextRecord, ...current];
      }

      return current.map((item) => (item.id === editingId ? nextRecord : item));
    });
    closeModal();
  }

  function handleDeleteActivity(id) {
    const approved = window.confirm(t("profile.confirm.deleteActivity"));
    if (!approved) {
      return;
    }

    setActivities((current) => current.filter((item) => item.id !== id));
    setPhotos((current) =>
      current.map((photo) =>
        photo.relatedActivityId === id
          ? {
              ...photo,
              relatedActivityId: "",
              relatedActivityTitle: "",
            }
          : photo,
      ),
    );
  }

  function openCreatePhotoModal() {
    setEditingId("");
    setFormError("");
    resetPhotoSelection();
    setPhotoForm(getDefaultPhotoForm());
    setActiveModal("photo");
  }

  function openEditPhotoModal(id) {
    const match = photos.find((item) => item.id === id);
    if (!match) {
      return;
    }

    setEditingId(id);
    setFormError("");
    resetPhotoSelection();
    setPhotoForm({
      title: match.title || "",
      caption: match.caption || "",
      date: match.date || "",
      relatedActivityId: match.relatedActivityId || "",
      imageDataUrl: match.imageDataUrl || "",
      imageAlt: match.imageAlt || "",
      fileName: match.fileName || "",
      fileType: match.fileType || "",
      fileSizeBytes: match.fileSizeBytes || 0,
      storageProvider: match.storageProvider || "temporary-localstorage",
      storagePath: match.storagePath || "",
    });
    setActiveModal("photo");
  }

  function handleUploadClick() {
    photoFileInputRef.current?.click();
  }

  function handleProfileAvatarUploadClick() {
    avatarFileInputRef.current?.click();
  }

  async function handleProfileAvatarChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setProfileAvatarError("");
    setProfileAvatarNotice("");

    if (!file.type || !file.type.startsWith("image/")) {
      setProfileAvatarError(t("profile.validation.onlyImages"));
      clearHiddenAvatarInput();
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      setProfileAvatarError(t("profile.validation.unsupportedImageType"));
      clearHiddenAvatarInput();
      return;
    }

    if (file.size > MAX_PHOTO_BYTES) {
      setProfileAvatarError(t("profile.validation.imageTooLarge"));
      clearHiddenAvatarInput();
      return;
    }

    clearAvatarPreviewUrl();
    setAvatarPreviewUrl(URL.createObjectURL(file));

    try {
      setIsProfileAvatarUploading(true);
      setProfileAvatarNotice(
        t("profile.details.uploadingAvatar", {
          defaultValue: "Uploading...",
        }),
      );
      const uploadedAvatar = await uploadProfileImage(userName, file);
      const safeAvatar = sanitizeProfileAvatar(uploadedAvatar);

      if (!safeAvatar) {
        throw new Error(
          t("profile.errors.saveImage", {
            defaultValue: "Could not save this image.",
          }),
        );
      }

      setProfileAvatar(safeAvatar);
      setProfileAvatarNotice(
        t("profile.details.avatarSaved", {
          defaultValue: "Profile photo saved.",
        }),
      );
      clearAvatarPreviewUrl();
    } catch (error) {
      clearAvatarPreviewUrl();
      setProfileAvatarError(
        error.message ||
          t("profile.errors.saveImage", {
            defaultValue: "Could not save this image.",
          }),
      );
    } finally {
      setIsProfileAvatarUploading(false);
      clearHiddenAvatarInput();
    }
  }

  async function handleRemoveProfileAvatar() {
    setProfileAvatarError("");
    setProfileAvatarNotice("");
    try {
      const removed = await removeProfileImage(userName);
      if (!removed) {
        throw new Error(
          t("profile.errors.saveImage", {
            defaultValue: "Could not save this image.",
          }),
        );
      }

      clearAvatarPreviewUrl();
      setProfileAvatar(null);
      setProfileAvatarNotice(
        t("profile.details.avatarRemoved", {
          defaultValue: "Profile photo removed.",
        }),
      );
    } catch (error) {
      setProfileAvatarError(
        error.message ||
          t("profile.errors.saveImage", {
            defaultValue: "Could not save this image.",
          }),
      );
    } finally {
      clearHiddenAvatarInput();
    }
  }

  function handleClearIdentitySearch() {
    setIdentitySearchQuery("");
  }

  function handleUseSearchAsCustomIdentity() {
    const cleaned = String(identitySearchQuery || "")
      .trim()
      .replace(/\s+/g, " ");
    if (!cleaned) {
      return;
    }

    setIdentityDraft((current) => {
      const existingIds = Array.isArray(current.selectedIdentityIds)
        ? current.selectedIdentityIds
        : [];
      const withOtherIdentity = existingIds.includes(OTHER_IDENTITY_ID)
        ? existingIds
        : [...existingIds, OTHER_IDENTITY_ID];

      return {
        ...current,
        selectedIdentityIds: withOtherIdentity,
        customInput: cleaned,
      };
    });
    setIdentityNotice("");
    setIdentityError("");
    setIsIdentityListExpanded(true);
  }

  function handleStartEditingProfileDetails() {
    setProfileDetailsDraft(profileDetails);
    setIsEditingProfileDetails(true);
  }

  function handleCancelProfileDetailsEdit() {
    setProfileDetailsDraft(profileDetails);
    setIsEditingProfileDetails(false);
  }

  function handleSaveProfileDetails(event) {
    event.preventDefault();
    const nextDetails = sanitizeProfileDetails(profileDetailsDraft, userName);
    setProfileDetails(nextDetails);
    setProfileDetailsDraft(nextDetails);
    setIsEditingProfileDetails(false);
  }

  function handlePhotoFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setFormError("");

    if (!file.type || !file.type.startsWith("image/")) {
      if (photoPreviewUrl) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
      setSelectedPhotoFile(null);
      setPhotoPreviewUrl("");
      clearHiddenPhotoInput();
      setPhotoUploadError(t("profile.validation.onlyImages"));
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      if (photoPreviewUrl) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
      setSelectedPhotoFile(null);
      setPhotoPreviewUrl("");
      clearHiddenPhotoInput();
      setPhotoUploadError(t("profile.validation.unsupportedImageType"));
      return;
    }

    if (file.size > MAX_PHOTO_BYTES) {
      if (photoPreviewUrl) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
      setSelectedPhotoFile(null);
      setPhotoPreviewUrl("");
      clearHiddenPhotoInput();
      setPhotoUploadError(t("profile.validation.imageTooLarge"));
      return;
    }

    if (photoPreviewUrl) {
      URL.revokeObjectURL(photoPreviewUrl);
    }

    setPhotoUploadError("");
    setSelectedPhotoFile(file);
    setPhotoPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSavePhoto(event) {
    event.preventDefault();

    if (!selectedPhotoFile) {
      setFormError(t("profile.validation.chooseImage"));
      return;
    }

    try {
      setIsSavingPhoto(true);
      const imageDataUrl = await readFileAsDataUrl(selectedPhotoFile);

      const nextRecord = {
        id: editingId || makeId("photo"),
        title: "",
        caption: "",
        date: new Date().toISOString().slice(0, 10),
        relatedActivityId: "",
        relatedActivityTitle: "",
        imageDataUrl,
        imageAlt:
          selectedPhotoFile.name ||
          t("profile.card.savedMemory", {
            defaultValue: "Saved Islamic memory",
          }),
        fileName: selectedPhotoFile.name,
        fileType: selectedPhotoFile.type,
        fileSizeBytes: selectedPhotoFile.size,
        storageProvider: "temporary-localstorage",
        storagePath: "",
        userKey: profileUserKey,
        updatedAt: new Date().toISOString(),
      };

      setPhotos((current) => {
        if (!editingId) {
          return [nextRecord, ...current];
        }

        return current.map((item) =>
          item.id === editingId ? nextRecord : item,
        );
      });
      closeModal();
    } catch (error) {
      setPhotoUploadError(
        error.message ||
          t("profile.errors.saveImage", {
            defaultValue: "Could not save this image.",
          }),
      );
    } finally {
      setIsSavingPhoto(false);
    }
  }

  function handleDeletePhoto(id) {
    const approved = window.confirm(t("profile.confirm.deletePhoto"));
    if (!approved) {
      return;
    }

    setPhotos((current) => current.filter((item) => item.id !== id));
  }

  function openCreateReminderModal() {
    setEditingId("");
    setFormError("");
    setReminderForm(getDefaultReminderForm());
    setActiveModal("reminder");
  }

  function openEditReminderModal(id) {
    const match = reminders.find((item) => item.id === id);
    if (!match) {
      return;
    }

    setEditingId(id);
    setFormError("");
    setReminderForm({
      title: match.title || "",
      text: match.text || "",
      category: match.category || "",
      source: match.source || "",
      note: match.note || "",
      dateSaved: match.dateSaved || "",
      isPinned: Boolean(match.isPinned),
    });
    setActiveModal("reminder");
  }

  function handleSaveReminder(event) {
    event.preventDefault();
    if (!reminderForm.title.trim()) {
      setFormError(t("profile.validation.reminderTitleRequired"));
      return;
    }

    if (!reminderForm.text.trim()) {
      setFormError(t("profile.validation.reminderTextRequired"));
      return;
    }

    const nextRecord = {
      id: editingId || makeId("rem"),
      title: reminderForm.title.trim(),
      text: reminderForm.text.trim(),
      category: reminderForm.category.trim(),
      source: reminderForm.source.trim(),
      note: reminderForm.note.trim(),
      dateSaved: reminderForm.dateSaved,
      isPinned: Boolean(reminderForm.isPinned),
      userKey: profileUserKey,
      updatedAt: new Date().toISOString(),
    };

    setReminders((current) => {
      if (!editingId) {
        return [nextRecord, ...current];
      }

      return current.map((item) => (item.id === editingId ? nextRecord : item));
    });
    closeModal();
  }

  function handleDeleteReminder(id) {
    const approved = window.confirm(t("profile.confirm.deleteReminder"));
    if (!approved) {
      return;
    }

    setReminders((current) => current.filter((item) => item.id !== id));
  }

  function handleToggleReminderPinned(id) {
    setReminders((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              isPinned: !item.isPinned,
              updatedAt: new Date().toISOString(),
            }
          : item,
      ),
    );
  }

  async function handleLanguageChange(event) {
    const nextLanguage = event.target.value;
    setSelectedLanguage(nextLanguage);
    await changeLanguage(nextLanguage);
  }

  function handleEditLanguageFocus() {
    languageSelectRef.current?.focus();
  }

  function handleToggleIdentity(nextIdentityId) {
    setIdentityError("");
    setIdentityNotice("");
    setIdentityDraft((current) => {
      const existing = Array.isArray(current.selectedIdentityIds)
        ? current.selectedIdentityIds
        : [];

      if (nextIdentityId === PREFER_NOT_TO_SAY_ID) {
        if (existing.includes(PREFER_NOT_TO_SAY_ID)) {
          return {
            ...current,
            selectedIdentityIds: [],
            preferNotToSay: false,
          };
        }

        return {
          ...current,
          selectedIdentityIds: [PREFER_NOT_TO_SAY_ID],
          preferNotToSay: true,
        };
      }

      if (existing.includes(nextIdentityId)) {
        return {
          ...current,
          selectedIdentityIds: existing.filter((id) => id !== nextIdentityId),
          preferNotToSay: false,
        };
      }

      return {
        ...current,
        selectedIdentityIds: [
          ...existing.filter((id) => id !== PREFER_NOT_TO_SAY_ID),
          nextIdentityId,
        ],
        preferNotToSay: false,
      };
    });
  }

  function handleIdentityOptionImageError(optionId) {
    setFailedIdentityImageIds((current) => {
      if (current.has(optionId)) {
        return current;
      }

      const next = new Set(current);
      next.add(optionId);
      return next;
    });
  }

  function handleIdentityListToggle() {
    setIsIdentityListExpanded((current) => !current);
  }

  function closeIdentityList() {
    setIsIdentityListExpanded(false);
    identityListTriggerRef.current?.focus();
  }

  function handleOtherIdentityTextChange(event) {
    setIdentityError("");
    setIdentityNotice("");
    setIdentityDraft((current) => ({
      ...current,
      customInput: event.target.value,
    }));
  }

  function handleAddCustomIdentity() {
    const cleaned = String(identityDraft.customInput || "")
      .trim()
      .replace(/\s+/g, " ");
    if (!cleaned) {
      return;
    }

    setIdentityError("");
    setIdentityNotice("");
    setIdentityDraft((current) => {
      const existing = Array.isArray(current.customEthnicities)
        ? current.customEthnicities
        : [];
      if (
        existing.some((value) => value.toLowerCase() === cleaned.toLowerCase())
      ) {
        return {
          ...current,
          customInput: "",
        };
      }

      return {
        ...current,
        customEthnicities: [...existing, cleaned],
        customInput: "",
      };
    });
  }

  function handleRemoveCustomIdentity(value) {
    setIdentityError("");
    setIdentityNotice("");
    setIdentityDraft((current) => ({
      ...current,
      customEthnicities: (current.customEthnicities || []).filter(
        (item) => item !== value,
      ),
    }));
  }

  function handleMoveSelectedIdentity(index, direction) {
    setIdentityError("");
    setIdentityNotice("");
    setIdentityDraft((current) => {
      const existing = Array.isArray(current.selectedIdentityIds)
        ? current.selectedIdentityIds
        : [];
      const nextIndex = direction === "up" ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= existing.length) {
        return current;
      }

      const next = [...existing];
      const [entry] = next.splice(index, 1);
      next.splice(nextIndex, 0, entry);
      return {
        ...current,
        selectedIdentityIds: next,
      };
    });
  }

  function handleSwapFlagOrder() {
    setIdentityError("");
    setIdentityNotice("");
    setIdentityDraft((current) => {
      const ids = Array.isArray(current.selectedIdentityIds)
        ? current.selectedIdentityIds
        : [];
      const flagIds = ids.filter((id) => {
        const option = PROFILE_FLAG_OPTIONS_BY_ID[id];
        return option?.visualType === "flag";
      });
      if (flagIds.length < 2) {
        return current;
      }

      const first = flagIds[0];
      const second = flagIds[1];
      const firstIndex = ids.indexOf(first);
      const secondIndex = ids.indexOf(second);
      const nextIds = [...ids];
      nextIds[firstIndex] = second;
      nextIds[secondIndex] = first;

      return {
        ...current,
        selectedIdentityIds: nextIds,
      };
    });
  }

  function handleSaveIdentityPreference() {
    const validationMessageKey = validateIdentityDraft(identityDraft);
    if (validationMessageKey) {
      setIdentityError(t(validationMessageKey));
      setIdentityNotice("");
      return;
    }

    const nextPreference = sanitizeProfileIdentityPreference(
      getPreferenceFromIdentityDraft(identityDraft),
    );
    writeStoredObject(
      profileUserKey,
      COLLECTIONS.IDENTITY_PREFERENCE,
      nextPreference,
    );

    void saveIdentityPreference(userName, {
      ethnicityIds: nextPreference.selectedIdentityIds,
      customEthnicities: nextPreference.customEthnicities,
      preferNotToSay: nextPreference.preferNotToSay,
    });

    setSavedIdentityPreference(nextPreference);
    setIdentityDraft(getIdentityDraftFromPreference(nextPreference));
    setIdentityError("");
    setIdentityNotice(t("profile.identity.messages.saved"));
  }

  function handleCancelIdentityPreference() {
    setIdentityDraft(getIdentityDraftFromPreference(savedIdentityPreference));
    setIdentityError("");
    setIdentityNotice(t("profile.identity.messages.cancelled"));
  }

  function handleRemoveIdentityPreference() {
    const clearedPreference = getDefaultProfileIdentityPreference();
    removeStoredValue(profileUserKey, COLLECTIONS.IDENTITY_PREFERENCE);
    setSavedIdentityPreference(clearedPreference);
    setIdentityDraft(getIdentityDraftFromPreference(clearedPreference));
    setIdentityError("");
    setIdentityNotice(t("profile.identity.messages.removed"));
  }

  const hasTwoFlagsInDraft = previewFlagState.layers.length === 2;

  const heritageIdentityLabel = useMemo(() => {
    if (!heroFlagState.selectedOptions.length) {
      return t("profile.details.noIdentity");
    }

    return heroFlagState.selectedOptions
      .map((option) =>
        t(option.displayNameKey, {
          defaultValue: option.displayName,
        }),
      )
      .join(" + ");
  }, [heroFlagState.selectedOptions, t]);

  const profileAvatarImageSource =
    avatarPreviewUrl ||
    profileAvatar?.imageUrl ||
    profileAvatar?.imageDataUrl ||
    "";

  const profileAvatarActionLabel = profileAvatarImageSource
    ? t("profile.details.replaceProfileImage", {
        defaultValue: "Replace Image",
      })
    : t("profile.actions.uploadImage");

  const savedEvents = useMemo(
    () =>
      savedEventIds
        .map((id) => EVENTS_CATALOG[id])
        .filter(Boolean)
        .slice(0, 8),
    [savedEventIds],
  );

  const previewOrderText = hasTwoFlagsInDraft
    ? t("profile.identity.previewOrder", {
        left: t(previewFlagState.layers[0].displayNameKey, {
          defaultValue: previewFlagState.layers[0].displayName,
        }),
        right: t(previewFlagState.layers[1].displayNameKey, {
          defaultValue: previewFlagState.layers[1].displayName,
        }),
      })
    : "";

  const selectedIdentityCount = identityDraft.selectedIdentityIds?.length || 0;
  const languageOptions = useMemo(
    () =>
      Array.isArray(selectableLanguages) && selectableLanguages.length
        ? selectableLanguages
        : [
            {
              id: "english",
              tag: "en",
              name: "English",
              nativeName: "English",
              direction: "ltr",
              classification: "language",
              region: "Global",
              interfaceStatus: "full",
              translationStatus: "provider-supported",
              exactDialectSupported: true,
            },
          ],
    [selectableLanguages],
  );

  const filteredLanguageOptions = useMemo(
    () =>
      rankLanguageCatalog(
        languageOptions,
        languageSearchQuery,
        selectedLanguage,
      ),
    [languageOptions, languageSearchQuery, selectedLanguage],
  );

  const selectedLanguageEntry = useMemo(
    () =>
      languageOptions.find((entry) => entry.tag === selectedLanguage) ||
      filteredLanguageOptions[0] ||
      null,
    [filteredLanguageOptions, languageOptions, selectedLanguage],
  );

  const selectedIdentityOptions = useMemo(
    () =>
      (identityDraft.selectedIdentityIds || [])
        .map((id) => PROFILE_FLAG_OPTIONS_BY_ID[id])
        .filter(Boolean),
    [identityDraft.selectedIdentityIds],
  );

  useEffect(() => {
    const selectedFlagOptions = selectedIdentityOptions.filter(
      (option) => option?.visualType === "flag",
    );

    const allOptions = [
      ...heroFlagState.layers,
      ...previewFlagState.layers,
      ...selectedFlagOptions,
    ];
    const nextCandidates = allOptions.filter(
      (option) =>
        option?.id &&
        option?.assetPath &&
        option?.visualType === "flag" &&
        !failedIdentityImageIds.has(option.id),
    );

    if (!nextCandidates.length) {
      return;
    }

    nextCandidates.forEach((option) => {
      const image = new Image();
      image.onload = () => {
        image.onload = null;
        image.onerror = null;
      };
      image.onerror = () => {
        handleIdentityOptionImageError(option.id);
        image.onload = null;
        image.onerror = null;
      };
      image.src = option.assetPath;
    });
  }, [
    failedIdentityImageIds,
    heroFlagState.layers,
    previewFlagState.layers,
    selectedIdentityOptions,
  ]);

  return (
    <main className="page profile-page">
      <section className="surface-panel profile-social-header">
        <div className="profile-banner">
          <div className="profile-banner-content">
            <p className="eyebrow">{t("profile.eyebrow")}</p>
            <p className="profile-banner-subtitle">{t("profile.subtitle")}</p>
            <label htmlFor="profile-language-preference">
              {t("language.description")}
            </label>
            <label htmlFor="profile-language-search">
              {t("language.searchLabel", {
                defaultValue: "Search languages and dialects",
              })}
            </label>
            <div className="language-search-wrap">
              <span className="language-search-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                  <circle
                    cx="11"
                    cy="11"
                    r="7"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <line
                    x1="16.65"
                    y1="16.65"
                    x2="21"
                    y2="21"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <input
                id="profile-language-search"
                type="search"
                value={languageSearchQuery}
                onChange={(event) => setLanguageSearchQuery(event.target.value)}
                placeholder={t("language.searchPlaceholder", {
                  defaultValue: "Search languages and dialects",
                })}
                autoComplete="off"
              />
            </div>
            <p className="language-search-count" aria-live="polite">
              {t("language.searchCount", {
                defaultValue: "{{count}} results",
                count: filteredLanguageOptions.length,
              })}
            </p>
            <select
              ref={languageSelectRef}
              id="profile-language-preference"
              value={selectedLanguage}
              onChange={handleLanguageChange}
              disabled={isSaving}
            >
              {filteredLanguageOptions.map((option) => (
                <option key={option.id || option.tag} value={option.tag}>
                  {[
                    option.name,
                    option.nativeName,
                    getLanguageSupportSummary(option),
                  ]
                    .filter(Boolean)
                    .join(" - ")}
                </option>
              ))}
            </select>
            {selectedLanguageEntry ? (
              <p className="language-search-meta" aria-live="polite">
                {getLanguageSupportSummary(selectedLanguageEntry)}
              </p>
            ) : null}
            {selectedLanguageEntry ? (
              <p
                className="profile-meta-line profile-meta-muted"
                aria-live="polite"
              >
                {t("profile.details.preferredLanguageSummary", {
                  defaultValue:
                    "Preferred language: {{name}} | Native: {{nativeName}} | Code: {{code}} | Direction: {{direction}}",
                  name: selectedLanguageEntry.name,
                  nativeName:
                    selectedLanguageEntry.nativeName ||
                    selectedLanguageEntry.name,
                  code: selectedLanguageEntry.tag,
                  direction:
                    selectedLanguageEntry.direction === "rtl" ? "RTL" : "LTR",
                })}
              </p>
            ) : null}
            {selectedLanguageEntry ? (
              <p
                className="profile-meta-line profile-meta-muted"
                aria-live="polite"
              >
                {t("profile.details.interfaceResolutionSummary", {
                  defaultValue:
                    "Current interface: {{interfaceTag}} | Exact support: {{exact}} | Fallback chain: {{chain}}",
                  interfaceTag: resolvedInterfaceTag,
                  exact: interfaceResolution?.exactInterfaceSupported
                    ? "yes"
                    : "no",
                  chain: (interfaceResolution?.fallbackChain || []).join(
                    " -> ",
                  ),
                })}
              </p>
            ) : null}
            {selectedLanguageEntry?.exactDialectSupported === false ? (
              <p
                className="profile-meta-line profile-meta-muted"
                role="status"
                aria-live="polite"
              >
                {t("language.fallbackNotice", {
                  defaultValue:
                    "Current interface may use a parent language fallback while keeping your exact dialect preference saved.",
                })}
              </p>
            ) : null}
            <button
              type="button"
              className="btn-secondary"
              onClick={handleEditLanguageFocus}
            >
              {t("profile.details.editLanguage", {
                defaultValue: "Edit Language",
              })}
            </button>
          </div>
        </div>

        <div className="profile-social-meta">
          <div className="profile-avatar-block">
            <input
              ref={avatarFileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleProfileAvatarChange}
              aria-label={t("profile.details.avatarFileInputLabel", {
                defaultValue: "Choose a profile photo",
              })}
              hidden
            />
            <button
              type="button"
              className="profile-avatar-wrap"
              onClick={handleProfileAvatarUploadClick}
              aria-label={profileAvatarActionLabel}
              disabled={isProfileAvatarUploading}
            >
              <HeritageAvatar
                profileImageUrl={profileAvatarImageSource}
                userName={profileDetails.displayName}
                avatarAlt={t("profile.details.avatarAlt")}
                identities={heroFlagState.selectedOptions}
                size="large"
                animated
                editable={false}
                className="profile-avatar-flag-visual"
              />
            </button>
            <div className="profile-avatar-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={handleProfileAvatarUploadClick}
                disabled={isProfileAvatarUploading}
                aria-label={profileAvatarActionLabel}
              >
                {isProfileAvatarUploading
                  ? t("profile.details.uploadingAvatar", {
                      defaultValue: "Uploading...",
                    })
                  : profileAvatarActionLabel}
              </button>
              {profileAvatarImageSource ? (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleRemoveProfileAvatar}
                  disabled={isProfileAvatarUploading}
                  aria-label={t("profile.details.removeProfileImage", {
                    defaultValue: "Remove Image",
                  })}
                >
                  {t("profile.details.removeProfileImage")}
                </button>
              ) : null}
            </div>
            <p className="profile-avatar-note">
              {t("profile.details.avatarUploadHint", {
                defaultValue:
                  "Tap your avatar or use Upload Image to set a profile photo.",
              })}
            </p>
            {isProfileAvatarUploading ? (
              <p
                className="profile-identity-note"
                role="status"
                aria-live="polite"
              >
                {t("profile.details.uploadingAvatar", {
                  defaultValue: "Uploading...",
                })}
              </p>
            ) : null}
          </div>

          <div className="profile-primary-meta">
            <h1>{profileDetails.displayName}</h1>
            {profileDetails.username ? (
              <p className="profile-meta-username">
                @{profileDetails.username}
              </p>
            ) : null}
            <p className="profile-meta-line">
              <strong>{t("profile.details.identityLabel")}:</strong>{" "}
              {heritageIdentityLabel}
            </p>
            <p className="profile-meta-line">
              <strong>
                {t("profile.details.preferredLanguageLabel", {
                  defaultValue: "Preferred language or dialect",
                })}
                :
              </strong>{" "}
              {selectedLanguageEntry
                ? `${selectedLanguageEntry.name}${selectedLanguageEntry.nativeName && selectedLanguageEntry.nativeName !== selectedLanguageEntry.name ? ` (${selectedLanguageEntry.nativeName})` : ""}`
                : selectedLanguage}
            </p>
            {profileDetails.bio ? (
              <p className="profile-meta-line">{profileDetails.bio}</p>
            ) : (
              <p className="profile-meta-line profile-meta-muted">
                {t("profile.details.bioPlaceholder")}
              </p>
            )}
            <p className="profile-meta-line profile-meta-muted">
              <strong>{t("profile.details.joinDateLabel")}:</strong>{" "}
              {profileDetails.joinDateLabel ||
                t("profile.details.joinDateFuture")}
            </p>
          </div>
        </div>

        {profileAvatarNotice ? (
          <p
            className="profile-identity-success"
            role="status"
            aria-live="polite"
          >
            {profileAvatarNotice}
          </p>
        ) : null}

        {profileAvatarError ? (
          <p className="profile-form-error" role="alert">
            {profileAvatarError}
          </p>
        ) : null}

        {isEditingProfileDetails ? (
          <form className="profile-form" onSubmit={handleSaveProfileDetails}>
            <label>
              {t("profile.details.displayNameLabel")}
              <input
                type="text"
                value={profileDetailsDraft.displayName}
                onChange={(event) =>
                  setProfileDetailsDraft((current) => ({
                    ...current,
                    displayName: event.target.value,
                  }))
                }
                required
              />
            </label>
            <label>
              {t("profile.details.usernameLabel")}
              <input
                type="text"
                value={profileDetailsDraft.username}
                onChange={(event) =>
                  setProfileDetailsDraft((current) => ({
                    ...current,
                    username: event.target.value,
                  }))
                }
                placeholder={t("profile.details.usernamePlaceholder")}
              />
            </label>
            <label>
              {t("profile.details.bioLabel")}
              <textarea
                value={profileDetailsDraft.bio}
                onChange={(event) =>
                  setProfileDetailsDraft((current) => ({
                    ...current,
                    bio: event.target.value,
                  }))
                }
                rows={3}
                placeholder={t("profile.details.bioPlaceholder")}
              />
            </label>
            <label>
              {t("profile.details.joinDateLabel")}
              <input
                type="text"
                value={profileDetailsDraft.joinDateLabel}
                onChange={(event) =>
                  setProfileDetailsDraft((current) => ({
                    ...current,
                    joinDateLabel: event.target.value,
                  }))
                }
                placeholder={t("profile.details.joinDateFuture")}
              />
            </label>

            <div className="profile-modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={handleCancelProfileDetailsEdit}
              >
                {t("profile.actions.cancel")}
              </button>
              <button type="submit" className="btn-primary">
                {t("profile.details.saveDetails")}
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            className="btn-secondary profile-edit-details-button"
            onClick={handleStartEditingProfileDetails}
          >
            {t("profile.details.editDetails")}
          </button>
        )}
      </section>

      <section className="surface-panel profile-section">
        <div className="profile-section-header">
          <h2>{t("profile.identity.title")}</h2>
        </div>
        <p className="profile-subtitle">{t("profile.identity.description")}</p>

        <div className="profile-identity-grid">
          <CombinedIdentityBadge
            selectedOptions={selectedIdentityOptions}
            className="profile-combined-identity-badge"
            wave
            ariaLabel={t("profile.identity.previewAria", {
              defaultValue: "Selected identities",
              flags: selectedIdentityOptions
                .map((option) => option.displayName)
                .join(", "),
            })}
          />

          <label htmlFor="profile-identity-search">
            {t("profile.identity.labels.search", {
              defaultValue: "Search identities",
            })}
          </label>
          <div className="profile-identity-search-wrap">
            <input
              id="profile-identity-search"
              type="search"
              value={identitySearchQuery}
              onChange={(event) => setIdentitySearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape" && identitySearchQuery) {
                  event.preventDefault();
                  handleClearIdentitySearch();
                }
              }}
              placeholder={t("profile.identity.searchPlaceholder", {
                defaultValue: "Search countries, regions, and identities",
              })}
              aria-describedby="profile-identity-result-count"
            />
            {identitySearchQuery ? (
              <button
                type="button"
                className="btn-secondary profile-identity-search-clear"
                onClick={handleClearIdentitySearch}
              >
                {t("profile.identity.actions.clearSearch", {
                  defaultValue: "Clear",
                })}
              </button>
            ) : null}
          </div>

          <p
            id="profile-identity-result-count"
            className="profile-identity-note"
            role="status"
            aria-live="polite"
          >
            {t("profile.identity.matchCount", {
              defaultValue: "{{count}} matching identities",
              count: filteredIdentityOptions.length,
            })}
          </p>

          {!hasExactIdentityMatch && normalizedIdentitySearchQuery ? (
            <button
              type="button"
              className="btn-secondary profile-add-custom-from-search"
              onClick={handleUseSearchAsCustomIdentity}
            >
              {t("profile.identity.actions.addCustomFromSearch", {
                defaultValue: "Add another identity",
              })}
            </button>
          ) : null}

          <button
            ref={identityListTriggerRef}
            type="button"
            className="btn-secondary profile-identity-list-toggle"
            onClick={handleIdentityListToggle}
            aria-expanded={isIdentityListExpanded}
            aria-controls="profile-identity-options"
          >
            {isIdentityListExpanded
              ? t("profile.identity.actions.hideList", {
                  defaultValue: "Hide identity list",
                })
              : t("profile.identity.actions.showList", {
                  defaultValue: "Show identity list",
                })}
          </button>

          <div
            id="profile-identity-options"
            className="profile-identity-options"
            aria-label="Identity options"
            hidden={!isIdentityListExpanded}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                closeIdentityList();
              }
            }}
          >
            {filteredIdentityOptions.map((option) => {
              const isChecked = identityDraft.selectedIdentityIds?.includes(
                option.id,
              );
              const imageFailed = failedIdentityImageIds.has(option.id);
              return (
                <label key={option.id} className="profile-identity-option-row">
                  <input
                    ref={
                      firstIdentityCheckboxRef.current
                        ? undefined
                        : firstIdentityCheckboxRef
                    }
                    type="checkbox"
                    checked={Boolean(isChecked)}
                    onChange={() => handleToggleIdentity(option.id)}
                    aria-checked={Boolean(isChecked)}
                  />
                  {option.visualType === "flag" &&
                  option.assetPath &&
                  !imageFailed ? (
                    <img
                      className="profile-identity-option-flag"
                      src={option.assetPath}
                      alt={t(option.accessibilityLabelKey, {
                        defaultValue: option.accessibilityLabel,
                      })}
                      loading="lazy"
                      decoding="async"
                      onError={() => handleIdentityOptionImageError(option.id)}
                    />
                  ) : (
                    <span
                      className="profile-identity-option-badge"
                      aria-hidden="true"
                    >
                      {option.badgeText || "ID"}
                    </span>
                  )}
                  <span>
                    {t(option.displayNameKey, {
                      defaultValue: option.displayName,
                    })}
                  </span>
                </label>
              );
            })}

            {filteredIdentityOptions.length === 0 ? (
              <div className="profile-identity-no-results" role="status">
                <p>
                  {t("profile.identity.noMatches", {
                    defaultValue: "No identities found.",
                  })}
                </p>
              </div>
            ) : null}
          </div>

          {selectedIdentityOptions.length ? (
            <div
              className="profile-selected-identities"
              aria-label="Selected identities"
            >
              {selectedIdentityOptions.map((option, index) => (
                <div
                  key={`selected-${option.id}`}
                  className="profile-selected-identity-row"
                >
                  <span>
                    {t(option.displayNameKey, {
                      defaultValue: option.displayName,
                    })}
                  </span>
                  <div className="profile-selected-identity-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => handleMoveSelectedIdentity(index, "up")}
                      disabled={index === 0}
                    >
                      {t("profile.identity.actions.moveUp", {
                        defaultValue: "Up",
                      })}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => handleMoveSelectedIdentity(index, "down")}
                      disabled={index === selectedIdentityOptions.length - 1}
                    >
                      {t("profile.identity.actions.moveDown", {
                        defaultValue: "Down",
                      })}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => handleToggleIdentity(option.id)}
                    >
                      {t("profile.identity.actions.removeItem", {
                        defaultValue: "Remove",
                      })}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <p className="profile-identity-note" role="status" aria-live="polite">
            {t("profile.identity.selectionCount", {
              defaultValue: "{{count}} selected",
              count: selectedIdentityCount,
            })}
          </p>

          <p className="profile-identity-note" id="profile-identity-save-help">
            {identityValidationMessageKey
              ? t(identityValidationMessageKey)
              : t("profile.identity.notExhaustive", {
                  defaultValue:
                    "Comprehensive and extensible worldwide identity catalog with custom identity support. Use Other identity to add your tribe, nation, or community.",
                })}
          </p>

          {identityDraft.selectedIdentityIds?.includes(OTHER_IDENTITY_ID) ? (
            <label htmlFor="profile-other-identity-input">
              {t("profile.identity.labels.otherIdentity", {
                defaultValue: "Other identity (optional)",
              })}
              <div className="profile-custom-identity-entry">
                <input
                  ref={otherIdentityInputRef}
                  id="profile-other-identity-input"
                  type="text"
                  value={identityDraft.customInput || ""}
                  onChange={handleOtherIdentityTextChange}
                  placeholder={t("profile.identity.otherIdentityPlaceholder", {
                    defaultValue: "Describe your identity",
                  })}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleAddCustomIdentity}
                >
                  {t("profile.identity.actions.addCustom", {
                    defaultValue: "Add",
                  })}
                </button>
              </div>

              {(identityDraft.customEthnicities || []).length ? (
                <div className="profile-custom-identity-list">
                  {(identityDraft.customEthnicities || []).map((value) => (
                    <div key={value} className="profile-custom-identity-row">
                      <span>{value}</span>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => handleRemoveCustomIdentity(value)}
                      >
                        {t("profile.identity.actions.removeItem", {
                          defaultValue: "Remove",
                        })}
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </label>
          ) : null}

          {hasTwoFlagsInDraft ? (
            <button
              type="button"
              className="btn-secondary"
              onClick={handleSwapFlagOrder}
            >
              {t("profile.identity.actions.swapOrder")}
            </button>
          ) : null}
        </div>

        <div
          className="profile-identity-preview"
          role="img"
          aria-label={
            previewFlagState.selectedOptions.length
              ? t("profile.identity.previewAria", {
                  flags: previewFlagState.selectedOptions
                    .map((option) =>
                      t(option.accessibilityLabelKey, {
                        defaultValue: option.accessibilityLabel,
                      }),
                    )
                    .join(", "),
                })
              : t("profile.identity.previewEmpty")
          }
        >
          <FlagBackground
            preference={previewFlagState.preference}
            className="profile-flag-background profile-flag-background--preview"
            failedImageIds={failedIdentityImageIds}
          />
          {previewFlagState.extraFlagCount > 0 ? (
            <span className="profile-flag-count-badge profile-flag-count-badge--preview">
              +{previewFlagState.extraFlagCount}
            </span>
          ) : null}
          <div className="profile-identity-preview-content">
            <p className="profile-identity-preview-title">
              {t("profile.identity.previewTitle")}
            </p>
            <p>
              {previewFlagState.selectedOptions.length
                ? previewFlagState.selectedOptions
                    .map((option) =>
                      t(option.displayNameKey, {
                        defaultValue: option.displayName,
                      }),
                    )
                    .join(" + ")
                : t("profile.identity.previewEmpty")}
            </p>
            {identityDraft.selectedIdentityIds?.includes(OTHER_IDENTITY_ID) &&
            (identityDraft.customEthnicities || []).length ? (
              <p>{identityDraft.customEthnicities.join(", ")}</p>
            ) : null}
            {previewOrderText ? <p>{previewOrderText}</p> : null}
            <p>
              {t("profile.identity.selectionCount", {
                defaultValue: "{{count}} selected",
                count: selectedIdentityCount,
              })}
            </p>
          </div>
        </div>

        {identityError ? (
          <p className="profile-form-error" role="alert">
            {identityError}
          </p>
        ) : null}

        {identityNotice ? (
          <p className="profile-identity-success" role="status">
            {identityNotice}
          </p>
        ) : null}

        <div className="profile-modal-actions profile-identity-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={handleSaveIdentityPreference}
            disabled={
              Boolean(identityValidationMessageKey) ||
              !hasUnsavedIdentityChanges
            }
            aria-disabled={
              Boolean(identityValidationMessageKey) ||
              !hasUnsavedIdentityChanges
            }
            aria-describedby="profile-identity-save-help"
          >
            {t("profile.identity.actions.save")}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleCancelIdentityPreference}
            disabled={!hasUnsavedIdentityChanges}
          >
            {t("profile.identity.actions.cancel")}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleRemoveIdentityPreference}
          >
            {t("profile.identity.actions.remove")}
          </button>
        </div>
      </section>

      <section
        className="profile-stats-grid"
        aria-label={t("profile.aria.stats")}
      >
        {statCards.map((card) => (
          <ProfileStatCard
            key={card.key}
            title={card.title}
            value={card.value}
            supportingText={card.supportingText}
            statusText={card.statusText}
          />
        ))}
      </section>

      {statsStatus === STATS_STATUS.ERROR && statsError ? (
        <p className="profile-error-banner" role="status">
          {statsError}
        </p>
      ) : null}

      <section className="surface-panel profile-section">
        <div className="profile-section-header">
          <h2>{t("profile.sections.lectures")}</h2>
          <button
            type="button"
            className="btn-primary"
            onClick={openCreateActivityModal}
          >
            {t("profile.actions.addActivity")}
          </button>
        </div>

        {activities.length === 0 ? (
          <p className="profile-empty-state">{t("profile.empty.lectures")}</p>
        ) : (
          <div className="profile-items-grid">
            {activities.map((item) => (
              <ActivityCard
                key={item.id}
                item={item}
                onEdit={openEditActivityModal}
                onDelete={handleDeleteActivity}
              />
            ))}
          </div>
        )}
      </section>

      <section className="surface-panel profile-section">
        <div className="profile-section-header">
          <h2>{t("profile.sections.events")}</h2>
          <Link to="/events" className="btn-secondary">
            {t("profile.actions.viewEvents")}
          </Link>
        </div>

        {savedEvents.length === 0 ? (
          <p className="profile-empty-state">{t("profile.empty.events")}</p>
        ) : (
          <div className="profile-items-grid">
            {savedEvents.map((eventItem) => (
              <article
                className="surface-card profile-item-card"
                key={eventItem.id}
              >
                <div className="profile-item-head">
                  <h3>{eventItem.name}</h3>
                  <span className="profile-item-type">
                    {t("profile.card.event")}
                  </span>
                </div>
                <p>
                  <strong>{t("profile.card.date")}:</strong> {eventItem.date}
                </p>
                <p>
                  <strong>{t("profile.card.venue")}:</strong> {eventItem.venue}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="surface-panel profile-section">
        <div className="profile-section-header">
          <h2>{t("profile.sections.photos")}</h2>
          <button
            type="button"
            className="btn-primary"
            onClick={openCreatePhotoModal}
          >
            {t("profile.actions.addPhoto")}
          </button>
        </div>

        {photos.length === 0 ? (
          <p className="profile-empty-state">{t("profile.empty.photos")}</p>
        ) : (
          <div className="profile-items-grid profile-items-grid--photos">
            {photos.map((item) => (
              <PhotoCard
                key={item.id}
                item={item}
                onEdit={openEditPhotoModal}
                onDelete={handleDeletePhoto}
              />
            ))}
          </div>
        )}
      </section>

      <section className="surface-panel profile-section">
        <div className="profile-section-header">
          <h2>{t("profile.sections.reminders")}</h2>
          <button
            type="button"
            className="btn-primary"
            onClick={openCreateReminderModal}
          >
            {t("profile.actions.addReminder")}
          </button>
        </div>

        {sortedReminders.length === 0 ? (
          <p className="profile-empty-state">{t("profile.empty.reminders")}</p>
        ) : (
          <div className="profile-items-grid">
            {sortedReminders.map((item) => (
              <ReminderCard
                key={item.id}
                item={item}
                onEdit={openEditReminderModal}
                onDelete={handleDeleteReminder}
                onTogglePinned={handleToggleReminderPinned}
              />
            ))}
          </div>
        )}
      </section>

      {activeModal === "activity" ? (
        <section className="profile-modal-backdrop" role="presentation">
          <div
            className="profile-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="activity-modal-title"
          >
            <h3 id="activity-modal-title">
              {editingId
                ? t("profile.modal.activity.editTitle")
                : t("profile.modal.activity.addTitle")}
            </h3>
            <form className="profile-form" onSubmit={handleSaveActivity}>
              <label>
                {t("profile.form.activity.title")}
                <input
                  type="text"
                  value={activityForm.title}
                  onChange={(event) =>
                    setActivityForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  required
                />
              </label>

              <label>
                {t("profile.form.activity.speaker")}
                <input
                  type="text"
                  value={activityForm.speaker}
                  onChange={(event) =>
                    setActivityForm((current) => ({
                      ...current,
                      speaker: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                {t("profile.form.activity.venue")}
                <input
                  type="text"
                  value={activityForm.venue}
                  onChange={(event) =>
                    setActivityForm((current) => ({
                      ...current,
                      venue: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                {t("profile.form.activity.dateAttended")}
                <input
                  type="date"
                  value={activityForm.dateAttended}
                  onChange={(event) =>
                    setActivityForm((current) => ({
                      ...current,
                      dateAttended: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                {t("profile.form.activity.eventType")}
                <input
                  type="text"
                  value={activityForm.eventType}
                  onChange={(event) =>
                    setActivityForm((current) => ({
                      ...current,
                      eventType: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                {t("profile.form.activity.notes")}
                <textarea
                  value={activityForm.notes}
                  onChange={(event) =>
                    setActivityForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  rows={3}
                />
              </label>

              <label>
                {t("profile.form.activity.photoUrl")}
                <input
                  type="url"
                  value={activityForm.photoDataUrl}
                  onChange={(event) =>
                    setActivityForm((current) => ({
                      ...current,
                      photoDataUrl: event.target.value,
                    }))
                  }
                  placeholder={t("profile.form.common.urlPlaceholder")}
                />
              </label>

              <label>
                {t("profile.form.activity.photoAlt")}
                <input
                  type="text"
                  value={activityForm.photoAlt}
                  onChange={(event) =>
                    setActivityForm((current) => ({
                      ...current,
                      photoAlt: event.target.value,
                    }))
                  }
                />
              </label>

              {formError ? (
                <p className="profile-form-error">{formError}</p>
              ) : null}

              <div className="profile-modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeModal}
                >
                  {t("profile.actions.cancel")}
                </button>
                <button type="submit" className="btn-primary">
                  {editingId
                    ? t("profile.actions.saveChanges")
                    : t("profile.actions.saveActivity")}
                </button>
              </div>
            </form>
          </div>
        </section>
      ) : null}

      {activeModal === "photo" ? (
        <section className="profile-modal-backdrop" role="presentation">
          <div
            className="profile-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="photo-modal-title"
          >
            <h3 id="photo-modal-title">
              {editingId
                ? t("profile.modal.photo.editTitle")
                : t("profile.modal.photo.addTitle")}
            </h3>
            <form className="profile-form" onSubmit={handleSavePhoto}>
              <input
                ref={photoFileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoFileChange}
                hidden
              />

              <button
                type="button"
                className="btn-secondary profile-upload-button"
                onClick={handleUploadClick}
              >
                {t("profile.actions.uploadImage")}
              </button>

              {photoUploadError ? (
                <p className="profile-form-error">{photoUploadError}</p>
              ) : null}

              {photoPreviewUrl ? (
                <img
                  className="profile-upload-preview"
                  src={photoPreviewUrl}
                  alt={t("profile.form.photo.previewAlt")}
                />
              ) : null}

              {formError ? (
                <p className="profile-form-error">{formError}</p>
              ) : null}

              <div className="profile-modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeModal}
                >
                  {t("profile.actions.cancel")}
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={!selectedPhotoFile || isSavingPhoto}
                >
                  {t("profile.actions.savePhoto")}
                </button>
              </div>
            </form>
          </div>
        </section>
      ) : null}

      {activeModal === "reminder" ? (
        <section className="profile-modal-backdrop" role="presentation">
          <div
            className="profile-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reminder-modal-title"
          >
            <h3 id="reminder-modal-title">
              {editingId
                ? t("profile.modal.reminder.editTitle")
                : t("profile.modal.reminder.addTitle")}
            </h3>
            <form className="profile-form" onSubmit={handleSaveReminder}>
              <label>
                {t("profile.form.reminder.title")}
                <input
                  type="text"
                  value={reminderForm.title}
                  onChange={(event) =>
                    setReminderForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  required
                />
              </label>

              <label>
                {t("profile.form.reminder.text")}
                <textarea
                  value={reminderForm.text}
                  onChange={(event) =>
                    setReminderForm((current) => ({
                      ...current,
                      text: event.target.value,
                    }))
                  }
                  rows={3}
                  required
                />
              </label>

              <label>
                {t("profile.form.reminder.category")}
                <input
                  type="text"
                  value={reminderForm.category}
                  onChange={(event) =>
                    setReminderForm((current) => ({
                      ...current,
                      category: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                {t("profile.form.reminder.source")}
                <input
                  type="text"
                  value={reminderForm.source}
                  onChange={(event) =>
                    setReminderForm((current) => ({
                      ...current,
                      source: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                {t("profile.form.reminder.note")}
                <textarea
                  rows={2}
                  value={reminderForm.note}
                  onChange={(event) =>
                    setReminderForm((current) => ({
                      ...current,
                      note: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                {t("profile.form.reminder.dateSaved")}
                <input
                  type="date"
                  value={reminderForm.dateSaved}
                  onChange={(event) =>
                    setReminderForm((current) => ({
                      ...current,
                      dateSaved: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="profile-checkbox-row">
                <input
                  type="checkbox"
                  checked={reminderForm.isPinned}
                  onChange={(event) =>
                    setReminderForm((current) => ({
                      ...current,
                      isPinned: event.target.checked,
                    }))
                  }
                />
                {t("profile.form.reminder.markPinned")}
              </label>

              {formError ? (
                <p className="profile-form-error">{formError}</p>
              ) : null}

              <div className="profile-modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeModal}
                >
                  {t("profile.actions.cancel")}
                </button>
                <button type="submit" className="btn-primary">
                  {editingId
                    ? t("profile.actions.saveChanges")
                    : t("profile.actions.saveReminder")}
                </button>
              </div>
            </form>
          </div>
        </section>
      ) : null}
    </main>
  );
}
