import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./BottomNav.css";

export default function BottomNav() {
  const { t } = useTranslation();

  return (
    <nav className="bottom-nav" aria-label="Primary navigation">
      <NavLink to="/" end>
        {t("nav.home")}
      </NavLink>

      <NavLink to="/live">{t("nav.live")}</NavLink>

      <NavLink to="/recordings">{t("nav.recordings")}</NavLink>

      <NavLink to="/masjids">{t("nav.masjids")}</NavLink>

      <NavLink to="/feed">{t("nav.feed")}</NavLink>

      <NavLink to="/profile">{t("nav.profile")}</NavLink>
    </nav>
  );
}
