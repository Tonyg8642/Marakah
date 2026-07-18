import { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import ProtectedRoute from "./ProtectedRoute";

const Home = lazy(() => import("../pages/Home/Home"));
const Live = lazy(() => import("../pages/Live/Live"));
const Recordings = lazy(() => import("../pages/Recordings/Recordings"));
const Masjids = lazy(() => import("../pages/Masjids/Masjids"));
const Restaurants = lazy(() => import("../pages/Restaurants/Restaurants"));
const Scholars = lazy(() => import("../pages/Scholars/Scholars"));
const Events = lazy(() => import("../pages/Events/Events"));
const QuranPage = lazy(() => import("../pages/Quran/QuranPage"));
const QuranLearning = lazy(() => import("../pages/Quran/QuranLearning"));
const QuranTransliterationPage = lazy(
  () => import("../pages/QuranTransliteration/QuranTransliterationPage"),
);
const Feed = lazy(() => import("../pages/Feed/Feed"));
const Profile = lazy(() => import("../pages/Profile/Profile"));
const Login = lazy(() => import("../pages/Auth/Login"));
const Signup = lazy(() => import("../pages/Auth/Signup"));
const PlatformAdmin = lazy(
  () => import("../pages/Admin/PlatformAdmin/PlatformAdmin"),
);
const MasjidDashboard = lazy(
  () => import("../pages/Admin/MasjidDashboard/MasjidDashboard"),
);

export default function AppRouter() {
  return (
    <Suspense
      fallback={
        <div className="page" role="status">
          Loading...
        </div>
      }
    >
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/live" element={<Live />} />
          <Route path="/recordings" element={<Recordings />} />
          <Route path="/masjids" element={<Masjids />} />
          <Route path="/restaurants" element={<Restaurants />} />
          <Route path="/scholars" element={<Scholars />} />
          <Route path="/events" element={<Events />} />
          <Route path="/feed" element={<Feed />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/quran" element={<QuranPage />} />
            <Route path="/arabic-for-beginners" element={<QuranLearning />} />
            <Route
              path="/quran-transliteration"
              element={<QuranTransliterationPage />}
            />
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Route>

        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/platform-admin" element={<PlatformAdmin />} />
          <Route path="/masjid-dashboard" element={<MasjidDashboard />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
