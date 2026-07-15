import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SearchBar from "../SearchBar/SearchBar";
import {
  clearSession,
  isSignedIn as hasActiveSession,
} from "../../auth/session";
import "./Header.css";

export default function Header() {
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
    <header className="header">
      <div className="header__row">
        <Link className="header__logo" to="/" aria-label="Marakah homepage">
          Marakah
        </Link>

        {signedIn ? null : <SearchBar />}

        <nav className="header__nav" aria-label="Header navigation">
          {signedIn ? (
            <button
              type="button"
              className="header__logout"
              onClick={handleLogout}
            >
              {t("nav.logout")}
            </button>
          ) : (
            <>
              <Link className="header__link" to="/events">
                {t("nav.events")}
              </Link>
              <Link className="header__link" to="/login">
                {t("nav.login")}
              </Link>
              <Link className="header__signup" to="/signup">
                {t("nav.signup")}
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
