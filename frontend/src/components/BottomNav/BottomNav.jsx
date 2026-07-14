import { NavLink } from "react-router-dom";
import "./BottomNav.css";

export default function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Primary navigation">
      <NavLink to="/" end>
        Home
      </NavLink>

      <NavLink to="/live">Live</NavLink>

      <NavLink to="/recordings">Recordings</NavLink>

      <NavLink to="/masjids">Masjids</NavLink>

      <NavLink to="/feed">Feed</NavLink>

      <NavLink to="/profile">Profile</NavLink>
    </nav>
  );
}
