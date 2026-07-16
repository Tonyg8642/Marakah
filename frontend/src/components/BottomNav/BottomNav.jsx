import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  clearSession,
  isSignedIn as hasActiveSession,
} from "../../auth/session";
import "./BottomNav.css";

export default function BottomNav() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    setSignedIn(hasActiveSession());
  }, [location.pathname]);

  function handleLogout() {
    clearSession();
    setSignedIn(false);
    navigate("/login");
  }

  return (
    <nav className="bottom-nav" aria-label="Primary navigation">
      <NavLink to="/" end>
        {t("nav.home")}
      </NavLink>

      <NavLink to="/live">{t("nav.live")}</NavLink>

      <NavLink to="/recordings">{t("nav.recordings")}</NavLink>

      <NavLink to="/masjids">{t("nav.masjids")}</NavLink>

      <NavLink to="/restaurants">{t("nav.restaurants")}</NavLink>

      <NavLink to="/feed">{t("nav.feed")}</NavLink>

      <NavLink to="/profile">{t("nav.profile")}</NavLink>

      {signedIn ? (
        <button
          type="button"
          className="bottom-nav__logout"
          onClick={handleLogout}
        >
          Log Out
        </button>
      ) : null}
    </nav>
  );
}
