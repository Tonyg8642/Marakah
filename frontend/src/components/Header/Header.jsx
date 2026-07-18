import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SearchBar from "../SearchBar/SearchBar";
import {
  clearSession,
  isSignedIn as hasActiveSession,
} from "../../auth/session";
import TranslationToolbar from "../TranslationControls/TranslationToolbar";
import NavigationMenu, { MENU_ID } from "../NavigationMenu/NavigationMenu";
import "../NavigationMenu/NavigationMenu.css";
import "./Header.css";

export default function Header() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const menuButtonRef = useRef(null);
  const [signedIn, setSignedIn] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    setSignedIn(hasActiveSession());
  }, [location.pathname]);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  function closeMenu() {
    setIsMenuOpen(false);
  }

  function toggleMenu() {
    setIsMenuOpen((current) => !current);
  }

  function handleMenuNavigate() {
    setIsMenuOpen(false);
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
    }
  }

  function handleLogout() {
    clearSession();
    setSignedIn(false);
    setIsMenuOpen(false);
    navigate("/login");
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
    }
  }

  return (
    <header className="header">
      <div className="header__row">
        <div className="header__brand">
          <Link
            className="header__logo"
            to="/"
            onClick={handleMenuNavigate}
            aria-label={t("nav.homepageAria", {
              defaultValue: "Marakah homepage",
            })}
          >
            Marakah
          </Link>

          <button
            ref={menuButtonRef}
            type="button"
            className="header__menu-button"
            aria-label={
              isMenuOpen ? "Close navigation menu" : "Open navigation menu"
            }
            aria-expanded={isMenuOpen}
            aria-controls={MENU_ID}
            onClick={toggleMenu}
          >
            <span className="header__menu-icon" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </button>
        </div>

        {signedIn ? null : <SearchBar />}

        <nav
          className="header__nav"
          aria-label={t("nav.headerNavigationAria", {
            defaultValue: "Header navigation",
          })}
        >
          <TranslationToolbar />
          {signedIn ? (
            <>
              <button
                type="button"
                className="header__logout"
                onClick={handleLogout}
              >
                {t("nav.logout")}
              </button>
            </>
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

      <NavigationMenu
        isOpen={isMenuOpen}
        isSignedIn={signedIn}
        onClose={closeMenu}
        onNavigate={handleMenuNavigate}
        onLogout={handleLogout}
        menuButtonRef={menuButtonRef}
      />
    </header>
  );
}
