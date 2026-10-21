import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import "./Navbar.css";

function Navbar() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function closeMenu() {
    setMenuOpen(false);
  }

  async function handleLogout() {
    setLoggingOut(true);
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Unable to log out:", error.message);
      window.alert("Unable to log out. Please try again.");
      setLoggingOut(false);
      return;
    }

    closeMenu();
    navigate("/login", { replace: true });
  }

  const navLinks = [
    { to: "/", label: "Dashboard", end: true },
    { to: "/calendar", label: "Calendar" },
    { to: "/clients", label: "Clients" },
    { to: "/pianos", label: "Pianos" },
    { to: "/finances", label: "Finances" },
    { to: "/settings", label: "Settings" },
  ];

  return (
    <header className="app-navbar">
      <div className="navbar-inner">
        <NavLink
          to="/"
          className="navbar-brand"
          onClick={closeMenu}
          aria-label="SchedApp home"
        >
          <span className="navbar-brand-text">SchedApp</span>
        </NavLink>

        <button
          type="button"
          className={`navbar-toggle ${menuOpen ? "is-open" : ""}`}
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
        >
          <span />
          <span />
          <span />
        </button>

        <nav
          id="primary-navigation"
          className={`navbar-navigation ${menuOpen ? "is-open" : ""}`}
          aria-label="Main navigation"
        >
          <div className="navbar-links">
            {navLinks.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `navbar-link${isActive ? " active" : ""}`
                }
                onClick={closeMenu}
              >
                {label}
              </NavLink>
            ))}
          </div>

          <div className="navbar-actions">
            <button
              type="button"
              className="navbar-logout"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M10 17l5-5-5-5" />
                <path d="M15 12H3" />
                <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
              </svg>
              {loggingOut ? "Logging out..." : "Log out"}
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}

export default Navbar;
