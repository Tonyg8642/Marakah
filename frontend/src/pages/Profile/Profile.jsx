import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ActivityCard from "./components/ActivityCard";
import PhotoCard from "./components/PhotoCard";
import ProfileStatCard from "./components/ProfileStatCard";
import ReminderCard from "./components/ReminderCard";
import { useLanguagePreference } from "../../contexts/LanguageContext";
import { fetchProfileStats } from "./profileApi";
import {
  createProfileUserKey,
  readCollection,
  readStoredObject,
  removeStoredValue,
  writeCollection,
  writeStoredObject,
} from "./profileStorage";
import {
  HERITAGE_OPTION_IDS,
  PALESTINIAN_SUPPORT_ID,
  PROFILE_FLAG_OPTIONS_BY_ID,
  PROFILE_SELECTION_MODES,
  PROFILE_SPLIT_DIRECTIONS,
} from "./profileFlagConfig";
import {
  getDefaultIdentityDraft,
  getDefaultProfileIdentityPreference,
  getFlagLayersFromPreference,
  getIdentityDraftFromPreference,
  getPreferenceFromIdentityDraft,
  sanitizeProfileIdentityPreference,
  validateIdentityDraft,
} from "./profileIdentityPreference";
import "./Profile.css";

const NAME_KEY = "marakah_user_name";
const STATS_STATUS = {
  LOADING: "loading",
  SUCCESS: "success",
  EMPTY: "empty",
  ERROR: "error",
};

const COLLECTIONS = {
  ACTIVITIES: "activities",
  PHOTOS: "photos",
  REMINDERS: "reminders",
  IDENTITY_PREFERENCE: "identityPreference",
  PROFILE_DETAILS: "profileDetails",
  PROFILE_AVATAR: "profileAvatar",
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
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

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
  const fileType = String(rawValue.fileType || "").trim();
  const fileName = String(rawValue.fileName || "").trim();
  const fileSizeBytes = Number(rawValue.fileSizeBytes) || 0;

  if (!imageDataUrl.startsWith("data:image/")) {
    return null;
  }

  if (!fileType.startsWith("image/")) {
    return null;
  }

  return {
    imageDataUrl,
    fileType,
    fileName,
    fileSizeBytes,
    storageProvider: "temporary-localstorage",
    storagePath: "",
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

function FlagBackground({ preference, className }) {
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
        const style = isVertical
          ? {
              "--profile-flag-image": `url(${option.assetPath})`,
              "--profile-flag-width": `${portion}%`,
              "--profile-flag-left": `${portion * index}%`,
              "--profile-flag-height": "100%",
              "--profile-flag-top": "0%",
            }
          : {
              "--profile-flag-image": `url(${option.assetPath})`,
              "--profile-flag-width": "100%",
              "--profile-flag-left": "0%",
              "--profile-flag-height": `${portion}%`,
              "--profile-flag-top": `${portion * index}%`,
            };

        return (
          <span
            key={`${option.id}-${index}`}
            className="profile-flag-layer"
            style={style}
          />
        );
      })}
      <span className="profile-flag-overlay" />
    </div>
  );
}

export default function Profile() {
  const { t } = useTranslation();
  const { language, changeLanguage, isSaving } = useLanguagePreference();
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
  const [savedIdentityPreference, setSavedIdentityPreference] = useState(
    getDefaultProfileIdentityPreference,
  );
  const [identityDraft, setIdentityDraft] = useState(getDefaultIdentityDraft);
  const [identityError, setIdentityError] = useState("");
  const [identityNotice, setIdentityNotice] = useState("");
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
  const photoFileInputRef = useRef(null);
  const avatarFileInputRef = useRef(null);

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

  const heritageOptions = useMemo(
    () =>
      HERITAGE_OPTION_IDS.map((id) => PROFILE_FLAG_OPTIONS_BY_ID[id]).filter(
        Boolean,
      ),
    [],
  );

  const secondaryHeritageOptions = useMemo(
    () =>
      heritageOptions.filter(
        (option) => option.id !== identityDraft.primarySelection,
      ),
    [heritageOptions, identityDraft.primarySelection],
  );

  useEffect(() => {
    setSelectedLanguage(language);
  }, [language]);

  useEffect(() => {
    return () => {
      if (photoPreviewUrl) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
    };
  }, [photoPreviewUrl]);

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

    try {
      const imageDataUrl = await readFileAsDataUrl(file);
      setProfileAvatar({
        imageDataUrl,
        fileName: file.name,
        fileType: file.type,
        fileSizeBytes: file.size,
        storageProvider: "temporary-localstorage",
        storagePath: "",
        updatedAt: new Date().toISOString(),
      });
      setProfileAvatarError("");
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

  function handleRemoveProfileAvatar() {
    setProfileAvatar(null);
    setProfileAvatarError("");
    clearHiddenAvatarInput();
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

  function handleSelectionModeChange(event) {
    const nextMode = event.target.value;

    setIdentityError("");
    setIdentityNotice("");

    setIdentityDraft((current) => {
      const nextDraft = {
        ...current,
        selectionMode: nextMode,
      };

      if (nextMode === PROFILE_SELECTION_MODES.NONE) {
        return {
          ...nextDraft,
          primarySelection: "",
          secondarySelection: "",
          includePalestinianSupport: false,
          supportOnLeft: false,
        };
      }

      if (nextMode === PROFILE_SELECTION_MODES.SUPPORT_FLAG) {
        return {
          ...nextDraft,
          primarySelection: PALESTINIAN_SUPPORT_ID,
          secondarySelection: "",
          includePalestinianSupport: false,
          supportOnLeft: false,
        };
      }

      if (nextMode === PROFILE_SELECTION_MODES.ONE_HERITAGE) {
        const primaryHeritage = HERITAGE_OPTION_IDS.includes(
          current.primarySelection,
        )
          ? current.primarySelection
          : "";

        return {
          ...nextDraft,
          primarySelection: primaryHeritage,
          secondarySelection: "",
          includePalestinianSupport: false,
          supportOnLeft: false,
        };
      }

      const primaryHeritage = HERITAGE_OPTION_IDS.includes(
        current.primarySelection,
      )
        ? current.primarySelection
        : "";
      const secondaryHeritage =
        HERITAGE_OPTION_IDS.includes(current.secondarySelection) &&
        current.secondarySelection !== primaryHeritage
          ? current.secondarySelection
          : "";

      return {
        ...nextDraft,
        primarySelection: primaryHeritage,
        secondarySelection: secondaryHeritage,
        includePalestinianSupport: false,
        supportOnLeft: false,
      };
    });
  }

  function handlePrimaryHeritageChange(event) {
    const value = event.target.value;
    setIdentityError("");
    setIdentityNotice("");

    setIdentityDraft((current) => {
      const nextDraft = {
        ...current,
        primarySelection: value,
      };

      if (
        current.selectionMode === PROFILE_SELECTION_MODES.TWO_HERITAGES &&
        current.secondarySelection === value
      ) {
        nextDraft.secondarySelection = "";
      }

      return nextDraft;
    });
  }

  function handleSecondaryHeritageChange(event) {
    const value = event.target.value;
    setIdentityError("");
    setIdentityNotice("");
    setIdentityDraft((current) => ({
      ...current,
      secondarySelection: value,
    }));
  }

  function handleTogglePalestinianSupport(event) {
    const checked = event.target.checked;

    setIdentityError("");
    setIdentityNotice("");
    setIdentityDraft((current) => ({
      ...current,
      includePalestinianSupport: checked,
      supportOnLeft: checked ? current.supportOnLeft : false,
    }));
  }

  function handleSwapFlagOrder() {
    setIdentityError("");
    setIdentityNotice("");
    setIdentityDraft((current) => {
      if (current.selectionMode === PROFILE_SELECTION_MODES.TWO_HERITAGES) {
        return {
          ...current,
          primarySelection: current.secondarySelection,
          secondarySelection: current.primarySelection,
        };
      }

      if (
        current.selectionMode === PROFILE_SELECTION_MODES.ONE_HERITAGE &&
        current.includePalestinianSupport
      ) {
        return {
          ...current,
          supportOnLeft: !current.supportOnLeft,
        };
      }

      return current;
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
    if (!heroFlagState.layers.length) {
      return t("profile.details.noIdentity");
    }

    return heroFlagState.layers
      .map((option) =>
        t(option.displayNameKey, {
          defaultValue: option.displayName,
        }),
      )
      .join(" + ");
  }, [heroFlagState.layers, t]);

  const profileAvatarInitial = useMemo(
    () => profileDetails.displayName?.trim().charAt(0).toUpperCase() || "M",
    [profileDetails.displayName],
  );

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

  return (
    <main className="page">
      <section className="surface-panel profile-social-header">
        <div
          className="profile-banner"
          role="img"
          aria-label={heritageIdentityLabel}
        >
          <FlagBackground
            preference={heroFlagState.preference}
            className="profile-flag-background profile-flag-background--banner"
          />
          <div className="profile-banner-content">
            <p className="eyebrow">{t("profile.eyebrow")}</p>
            <p className="profile-banner-subtitle">{t("profile.subtitle")}</p>
            <label htmlFor="profile-language-preference">
              {t("language.description")}
            </label>
            <select
              id="profile-language-preference"
              value={selectedLanguage}
              onChange={handleLanguageChange}
              disabled={isSaving}
            >
              {["en", "ar", "fa", "ur", "so", "es"].map((option) => (
                <option key={option} value={option}>
                  {t(`language.options.${option}`)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="profile-social-meta">
          <div className="profile-avatar-block">
            <input
              ref={avatarFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleProfileAvatarChange}
              hidden
            />
            <div className="profile-avatar-wrap">
              {profileAvatar?.imageDataUrl ? (
                <img
                  src={profileAvatar.imageDataUrl}
                  alt={t("profile.details.avatarAlt")}
                  className="profile-avatar-image"
                />
              ) : (
                <span className="profile-avatar-fallback" aria-hidden="true">
                  {profileAvatarInitial}
                </span>
              )}
            </div>
            <div className="profile-avatar-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={handleProfileAvatarUploadClick}
              >
                {t("profile.actions.uploadImage")}
              </button>
              {profileAvatar ? (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleRemoveProfileAvatar}
                >
                  {t("profile.details.removeProfileImage")}
                </button>
              ) : null}
            </div>
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
          <label htmlFor="profile-selection-mode">
            {t("profile.identity.labels.selectionType")}
          </label>
          <select
            id="profile-selection-mode"
            value={identityDraft.selectionMode}
            onChange={handleSelectionModeChange}
          >
            <option value={PROFILE_SELECTION_MODES.NONE}>
              {t("profile.identity.selectionType.none")}
            </option>
            <option value={PROFILE_SELECTION_MODES.ONE_HERITAGE}>
              {t("profile.identity.selectionType.oneHeritage")}
            </option>
            <option value={PROFILE_SELECTION_MODES.TWO_HERITAGES}>
              {t("profile.identity.selectionType.twoHeritages")}
            </option>
            <option value={PROFILE_SELECTION_MODES.SUPPORT_FLAG}>
              {t("profile.identity.selectionType.supportFlag")}
            </option>
          </select>

          {identityDraft.selectionMode ===
            PROFILE_SELECTION_MODES.ONE_HERITAGE ||
          identityDraft.selectionMode ===
            PROFILE_SELECTION_MODES.TWO_HERITAGES ? (
            <>
              <label htmlFor="profile-primary-heritage">
                {t("profile.identity.labels.firstHeritage")}
              </label>
              <select
                id="profile-primary-heritage"
                value={identityDraft.primarySelection}
                onChange={handlePrimaryHeritageChange}
              >
                <option value="">
                  {t("profile.identity.selectPlaceholder")}
                </option>
                {heritageOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {t(option.displayNameKey, {
                      defaultValue: option.displayName,
                    })}
                  </option>
                ))}
              </select>
            </>
          ) : null}

          {identityDraft.selectionMode ===
          PROFILE_SELECTION_MODES.TWO_HERITAGES ? (
            <>
              <label htmlFor="profile-secondary-heritage">
                {t("profile.identity.labels.secondHeritage")}
              </label>
              <select
                id="profile-secondary-heritage"
                value={identityDraft.secondarySelection}
                onChange={handleSecondaryHeritageChange}
              >
                <option value="">
                  {t("profile.identity.selectPlaceholder")}
                </option>
                {secondaryHeritageOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {t(option.displayNameKey, {
                      defaultValue: option.displayName,
                    })}
                  </option>
                ))}
              </select>
            </>
          ) : null}

          {identityDraft.selectionMode ===
          PROFILE_SELECTION_MODES.ONE_HERITAGE ? (
            <label
              className="profile-checkbox-row"
              htmlFor="profile-support-toggle"
            >
              <input
                id="profile-support-toggle"
                type="checkbox"
                checked={identityDraft.includePalestinianSupport}
                onChange={handleTogglePalestinianSupport}
              />
              {t("profile.identity.labels.palestinianSupport")}
            </label>
          ) : null}

          {identityDraft.selectionMode ===
          PROFILE_SELECTION_MODES.SUPPORT_FLAG ? (
            <p className="profile-identity-note">
              {t("profile.identity.supportOnlyDescription")}
            </p>
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
            previewFlagState.layers.length
              ? t("profile.identity.previewAria", {
                  flags: previewFlagState.layers
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
          />
          <div className="profile-identity-preview-content">
            <p className="profile-identity-preview-title">
              {t("profile.identity.previewTitle")}
            </p>
            <p>
              {previewFlagState.layers.length
                ? previewFlagState.layers
                    .map((option) =>
                      t(option.displayNameKey, {
                        defaultValue: option.displayName,
                      }),
                    )
                    .join(" + ")
                : t("profile.identity.previewEmpty")}
            </p>
            {previewOrderText ? <p>{previewOrderText}</p> : null}
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
        role="list"
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
