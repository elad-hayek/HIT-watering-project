import React from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Header.css";

export default function Header({ user, setUser, darkMode, setDarkMode }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
    navigate("/");
  };

  // Helper to check if user is admin
  const isAdmin = () => {
    return user && user.role === "admin";
  };

  return (
    <header className="header">
      <div className="header-content">
        <Link to="/" className="logo">
          <i className="fas fa-leaf"></i>
          <span>Watering Dashboard</span>
        </Link>

        <nav className="nav-menu">
          {user ? (
            <>
              <Link to="/" className="nav-link">
                <i className="fas fa-home"></i> Home
              </Link>
              {isAdmin() && (
                <>
                  <Link to="/activity" className="nav-link">
                    <i className="fas fa-history"></i> Activity
                  </Link>
                  <Link to="/user-management" className="nav-link">
                    <i className="fas fa-users-cog"></i> User Management
                  </Link>
                </>
              )}
              <Link to="/user" className="nav-link">
                <i className="fas fa-user"></i> Profile
              </Link>
              <button
                className="nav-link theme-toggle"
                onClick={() => setDarkMode(!darkMode)}
                title={darkMode ? "Light Mode" : "Dark Mode"}
              >
                <i className={darkMode ? "fas fa-sun" : "fas fa-moon"}></i>
              </button>
              <button onClick={handleLogout} className="nav-link logout-btn">
                <i className="fas fa-sign-out-alt"></i> Logout
              </button>
              <div className="user-info">
                <span className="user-name">
                  {user.name}
                  {isAdmin() && <span className="user-role">Admin</span>}
                </span>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">
                <i className="fas fa-sign-in-alt"></i> Login
              </Link>
              <Link to="/register" className="nav-link">
                <i className="fas fa-user-plus"></i> Register
              </Link>
              <button
                className="nav-link theme-toggle"
                onClick={() => setDarkMode(!darkMode)}
                title={darkMode ? "Light Mode" : "Dark Mode"}
              >
                <i className={darkMode ? "fas fa-sun" : "fas fa-moon"}></i>
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
