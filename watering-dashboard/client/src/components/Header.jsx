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

  // Helper to get role display name
  const getRoleDisplay = () => {
    if (!user) return "";
    const roles = {
      user: "User",
      area_manager: "Area Manager",
      admin: "Administrator",
    };
    return roles[user.role] || user.role;
  };

  // Helper to check if user can view activity
  const canViewActivity = () => {
    return user && (user.role === "area_manager" || user.role === "admin");
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
              {canViewActivity() && (
                <Link to="/activity" className="nav-link">
                  <i className="fas fa-history"></i> Activity
                </Link>
              )}
              {isAdmin() && (
                <Link to="/user-management" className="nav-link">
                  <i className="fas fa-users-cog"></i> User Management
                </Link>
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
                <span className="user-name">{user.name}</span>
                <span className="user-role">{getRoleDisplay()}</span>
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
