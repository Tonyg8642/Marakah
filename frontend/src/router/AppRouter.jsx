import { Routes, Route } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import Home from "../pages/Home/Home";
import Live from "../pages/Live/Live";
import Recordings from "../pages/Recordings/Recordings";
import Masjids from "../pages/Masjids/Masjids";
import Scholars from "../pages/Scholars/Scholars";
import Events from "../pages/Events/Events";
import Feed from "../pages/Feed/Feed";
import Profile from "../pages/Profile/Profile";
import Login from "../pages/Auth/Login";
import Signup from "../pages/Auth/Signup";
import PlatformAdmin from "../pages/Admin/PlatformAdmin/PlatformAdmin";
import MasjidDashboard from "../pages/Admin/MasjidDashboard/MasjidDashboard";
import ProtectedRoute from "./ProtectedRoute";

export default function AppRouter() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/live" element={<Live />} />
        <Route path="/recordings" element={<Recordings />} />
        <Route path="/masjids" element={<Masjids />} />
        <Route path="/scholars" element={<Scholars />} />
        <Route path="/events" element={<Events />} />
        <Route path="/feed" element={<Feed />} />
        <Route element={<ProtectedRoute />}>
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
  );
}
