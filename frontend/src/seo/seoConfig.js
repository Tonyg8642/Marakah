export const DEFAULT_SITE_URL = "https://www.marakah.app";

export const ROUTE_SEO = {
  "/": {
    titleKey: "seo.homeTitle",
    descriptionKey: "seo.homeDescription",
    title: "Marakah | Islamic Learning, Reminders, and Community",
    description:
      "Discover Islamic reminders, live sessions, nearby masjids, scholars, and community events with Marakah.",
    keywords:
      "Marakah, Islamic app, Muslim community, Qur'an reminders, masjid finder, Islamic lectures",
    index: true,
    changefreq: "daily",
    priority: "1.0",
  },
  "/live": {
    titleKey: "seo.liveTitle",
    descriptionKey: "seo.liveDescription",
    title: "Live Sessions | Marakah",
    description:
      "Join live Islamic sessions, Qur'an circles, and community Q&A streams on Marakah.",
    keywords:
      "live Islamic lectures, Qur'an circle live, Muslim live stream, Marakah live",
    index: true,
    changefreq: "daily",
    priority: "0.9",
  },
  "/recordings": {
    titleKey: "seo.recordingsTitle",
    descriptionKey: "seo.recordingsDescription",
    title: "Lecture Recordings | Marakah",
    description:
      "Browse khutbah recordings and Islamic lectures to continue learning at your own pace.",
    keywords:
      "Islamic recordings, khutbah archive, tafsir lectures, Muslim learning",
    index: true,
    changefreq: "weekly",
    priority: "0.85",
  },
  "/masjids": {
    titleKey: "seo.masjidsTitle",
    descriptionKey: "seo.masjidsDescription",
    title: "Find Nearby Masjids | Marakah",
    description:
      "Search real nearby masjids, view prayer times, and discover events in your local community.",
    keywords:
      "masjid finder, nearby mosque, prayer times, Islamic events near me",
    index: true,
    changefreq: "daily",
    priority: "0.95",
  },
  "/scholars": {
    titleKey: "seo.scholarsTitle",
    descriptionKey: "seo.scholarsDescription",
    title: "Scholars and Educators | Marakah",
    description:
      "Learn from trusted scholars and Islamic educators across tafsir, seerah, and tarbiyah topics.",
    keywords:
      "Islamic scholars, Muslim teachers, seerah lessons, tafsir learning",
    index: true,
    changefreq: "weekly",
    priority: "0.8",
  },
  "/events": {
    titleKey: "seo.eventsTitle",
    descriptionKey: "seo.eventsDescription",
    title: "Islamic Events Calendar | Marakah",
    description:
      "Explore upcoming halaqahs, youth nights, and community events from local masjids.",
    keywords:
      "Islamic events, Muslim community calendar, halaqah schedule, masjid events",
    index: true,
    changefreq: "daily",
    priority: "0.9",
  },
  "/feed": {
    titleKey: "seo.feedTitle",
    descriptionKey: "seo.feedDescription",
    title: "Community Feed | Marakah",
    description:
      "Stay connected with beneficial updates, reminders, and announcements from the Marakah community.",
    keywords: "Muslim community feed, Islamic updates, Marakah community",
    index: true,
    changefreq: "hourly",
    priority: "0.8",
  },
  "/profile": {
    titleKey: "seo.profileTitle",
    descriptionKey: "seo.profileDescription",
    title: "My Profile | Marakah",
    description:
      "Track your Islamic learning progress, reminders, and personal activity in your Marakah profile.",
    keywords: "Marakah profile, Islamic progress tracker, saved reminders",
    index: false,
    changefreq: "weekly",
    priority: "0.4",
  },
  "/login": {
    titleKey: "seo.loginTitle",
    descriptionKey: "seo.loginDescription",
    title: "Log In | Marakah",
    description:
      "Securely log in to Marakah to continue your Islamic learning journey.",
    keywords: "Marakah login, secure sign in",
    index: false,
    changefreq: "monthly",
    priority: "0.3",
  },
  "/signup": {
    titleKey: "seo.signupTitle",
    descriptionKey: "seo.signupDescription",
    title: "Sign Up | Marakah",
    description:
      "Create your Marakah account and join a community centered on Islamic growth.",
    keywords: "Marakah sign up, create Muslim learning account",
    index: true,
    changefreq: "monthly",
    priority: "0.7",
  },
  "/platform-admin": {
    titleKey: "seo.platformAdminTitle",
    descriptionKey: "seo.platformAdminDescription",
    title: "Platform Admin | Marakah",
    description:
      "Platform administration tools for managing Marakah operations.",
    keywords: "Marakah admin",
    index: false,
    changefreq: "monthly",
    priority: "0.2",
  },
  "/masjid-dashboard": {
    titleKey: "seo.masjidDashboardTitle",
    descriptionKey: "seo.masjidDashboardDescription",
    title: "Masjid Dashboard | Marakah",
    description:
      "Masjid administration dashboard for attendance, classes, and volunteer insights.",
    keywords: "masjid dashboard, Marakah management",
    index: false,
    changefreq: "weekly",
    priority: "0.3",
  },
};

export function getSeoForPath(pathname) {
  const normalized =
    pathname && pathname !== "/" && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname || "/";

  return ROUTE_SEO[normalized] || ROUTE_SEO["/"];
}

export function buildCanonical(siteUrl, pathname) {
  const normalizedPath =
    pathname && pathname !== "/" && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname || "/";

  return `${siteUrl}${normalizedPath}`;
}

export function getSiteUrl() {
  const configured = import.meta.env.VITE_SITE_URL;
  if (configured && /^https?:\/\//i.test(configured)) {
    return configured.replace(/\/$/, "");
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  return DEFAULT_SITE_URL;
}
