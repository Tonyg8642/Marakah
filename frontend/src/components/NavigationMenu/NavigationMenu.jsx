import { useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";

const MENU_ID = "global-navigation-menu";

const MAIN_ITEMS = [
  { label: "Home", path: "/" },
  { label: "Feed", path: "/feed" },
  { label: "Events", path: "/events" },
];

const LEARN_ITEMS = [
  { label: "Quran", path: "/quran", requiresAuth: true },
  {
    label: "Quran Transliteration",
    path: "/quran-transliteration",
    requiresAuth: true,
  },
  {
    label: "Arabic for Beginners",
    path: "/arabic-for-beginners",
    requiresAuth: true,
  },
  { label: "Scholars", path: "/scholars" },
  { label: "Live", path: "/live" },
  { label: "Recordings", path: "/recordings" },
];

const DISCOVER_ITEMS = [
  { label: "Masjids", path: "/masjids" },
  { label: "Restaurants", path: "/restaurants" },
];

export default function NavigationMenu({
  isOpen,
  isSignedIn,
  onClose,
  onNavigate,
  onLogout,
  menuButtonRef,
}) {
  const closeButtonRef = useRef(null);

  const accountItems = isSignedIn
    ? [{ label: "Profile", path: "/profile", requiresAuth: true }]
    : [
        { label: "Log In", path: "/login" },
        { label: "Sign Up", path: "/signup" },
      ];

  function visibleItems(items) {
    return items.filter((item) => !item.requiresAuth || isSignedIn);
  }

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    closeButtonRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      menuButtonRef?.current?.focus();
    }
  }, [isOpen, menuButtonRef]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="navigation-menu__overlay"
      role="presentation"
      onClick={onClose}
    >
      <aside
        id={MENU_ID}
        className="navigation-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="navigation-menu__header">
          <div>
            <p className="navigation-menu__brand">Marakah</p>
            <p className="navigation-menu__description">
              Explore learning, community, masjids, restaurants, and more.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="navigation-menu__close"
            onClick={onClose}
            aria-label="Close navigation menu"
          >
            ×
          </button>
        </header>

        <nav className="navigation-menu__content" aria-label="Main menu">
          <MenuSection
            title="Main"
            items={visibleItems(MAIN_ITEMS)}
            onNavigate={onNavigate}
          />
          <MenuSection
            title="Learn"
            items={visibleItems(LEARN_ITEMS)}
            onNavigate={onNavigate}
          />
          <MenuSection
            title="Discover"
            items={visibleItems(DISCOVER_ITEMS)}
            onNavigate={onNavigate}
          />
          <MenuSection
            title="Account"
            items={visibleItems(accountItems)}
            onNavigate={onNavigate}
          />

          {isSignedIn ? (
            <button
              type="button"
              className="navigation-menu__logout"
              onClick={onLogout}
            >
              Log Out
            </button>
          ) : null}
        </nav>
      </aside>
    </div>
  );
}

function MenuSection({ title, items, onNavigate }) {
  if (!items.length) {
    return null;
  }

  return (
    <section className="navigation-menu__section" aria-label={title}>
      <h2>{title}</h2>
      <ul>
        {items.map((item) => (
          <li key={item.path}>
            <NavLink
              to={item.path}
              className={({ isActive }) =>
                `navigation-menu__link ${isActive ? "navigation-menu__link_active" : ""}`
              }
              onClick={onNavigate}
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </section>
  );
}

export { MENU_ID };
