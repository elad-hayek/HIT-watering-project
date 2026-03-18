import React from "react";
import { Link } from "react-router-dom";
import "./Home.css";

export default function Home() {
  return (
    <div className="home-container">
      <div className="home-content">
        <div className="hero">
          <div className="hero-icon">🌿</div>
          <h1>Watering Dashboard</h1>
          <p>Manage your watering zones and plants with ease</p>

          <div className="features">
            <div className="feature">
              <i className="fas fa-map"></i>
              <h3>Interactive Maps</h3>
              <p>Create and manage watering zones with detailed maps</p>
            </div>
            <div className="feature">
              <i className="fas fa-leaf"></i>
              <h3>Plant Management</h3>
              <p>Track plants, watering schedules, and health status</p>
            </div>
          </div>

          <div className="cta-buttons">
            <Link to="/login" className="btn btn-primary">
              <i className="fas fa-sign-in-alt"></i> Login
            </Link>
            <Link to="/register" className="btn btn-secondary">
              <i className="fas fa-user-plus"></i> Register
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
