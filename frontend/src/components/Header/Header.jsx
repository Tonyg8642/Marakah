import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import SearchBar from "../SearchBar/SearchBar";
import "./Header.css";

const SIGNED_IN_KEY = "marakah_is_signed_in";
const NAME_KEY = "marakah_user_name";

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    setIsSignedIn(localStorage.getItem(SIGNED_IN_KEY) === "true");
  }, [location.pathname]);

  function handleLogout() {
    localStorage.removeItem(SIGNED_IN_KEY);
    localStorage.removeItem(NAME_KEY);
    setIsSignedIn(false);
    navigate("/login");
  }

  return (
    <header className="header">
      <div className="header__row">
        <Link className="header__logo" to="/">
          Marakah
        </Link>

        {isSignedIn ? null : <SearchBar />}

        <nav className="header__nav">
          {isSignedIn ? (
            <button
              type="button"
              className="header__logout"
              onClick={handleLogout}
            >
              Log Out
            </button>
          ) : (
            <>
              <Link className="header__link" to="/events">
                Events
              </Link>
              <Link className="header__link" to="/login">
                Log In
              </Link>
              <Link className="header__signup" to="/signup">
                Sign Up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
