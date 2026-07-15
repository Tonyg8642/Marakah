import { Navigate, Outlet, useLocation } from "react-router-dom";
import { isSignedIn } from "../auth/session";

export default function ProtectedRoute() {
  const location = useLocation();

  if (!isSignedIn()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
