import React, { useState, useEffect } from "react";
import "./user.css";

export default function User({ user, setUser }) {
  const [formData, setFormData] = useState({
    name: "",
    lastname: "",
    city: "",
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState("");

  // Get role display name
  const getRoleDisplayName = () => {
    const roles = {
      user: "User",
      area_manager: "Area Manager",
      admin: "Administrator",
    };
    return roles[user?.role] || user?.role || "Unknown";
  };

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        lastname: user.lastname || "",
        city: user.city || "",
      });
      setLoading(false);
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setMessage("");

    try {
      // In a real app, you would send this to the server
      const updatedUser = {
        ...user,
        ...formData,
      };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
      setMessage("Profile updated successfully!");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage("Error updating profile: " + err.message);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="user-loading">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div className="user-container">
      <div className="user-profile">
        <div className="profile-header">
          <div className="profile-avatar">
            <i className="fas fa-user-circle"></i>
          </div>
          <div className="profile-info">
            <h2>
              {user.name} {user.lastname}
            </h2>
            <p className="user-id">ID: {user.username}</p>
            <p className="user-role">
              Role: <strong>{getRoleDisplayName()}</strong>
            </p>
            {user.title && <p className="user-title">{user.title}</p>}
          </div>
        </div>

        {message && (
          <div
            className={`message ${message.includes("Error") ? "error" : "success"}`}
          >
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="profile-form">
          <div className="form-group">
            <label>First Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Last Name</label>
            <input
              type="text"
              name="lastname"
              value={formData.lastname}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Role (Read-only)</label>
            <div className="role-readonly">
              <span className="role-badge">{getRoleDisplayName()}</span>
              <p className="role-note">
                Your role can only be changed by an administrator.
              </p>
            </div>
          </div>

          <div className="form-group">
            <label>City</label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={updating}>
            {updating ? "Updating..." : "Update Profile"}
          </button>
        </form>

        <div className="profile-stats">
          <div className="stat">
            <i className="fas fa-calendar"></i>
            <span>
              Member Since:{" "}
              {new Date(user.created_at || Date.now()).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
