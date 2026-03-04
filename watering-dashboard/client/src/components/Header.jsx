import React from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Header.css";

export default function Header({ user, setUser }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
    navigate("/");
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
              <Link to="/user" className="nav-link">
                <i className="fas fa-user"></i> Profile
              </Link>
              <button onClick={handleLogout} className="nav-link logout-btn">
                <i className="fas fa-sign-out-alt"></i> Logout
              </button>
              <div className="user-info">
                <span className="user-name">{user.name}</span>
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
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
