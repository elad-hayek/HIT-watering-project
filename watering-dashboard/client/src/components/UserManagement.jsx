import React, { useState, useEffect } from "react";
import "./UserManagement.css";

export default function UserManagement({ user }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [message, setMessage] = useState("");
  const [hasAttemptedSearch, setHasAttemptedSearch] = useState(false);

  // Check if user is admin
  const isAdmin = user?.role === "admin";

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setUsers([]);
      setHasAttemptedSearch(false);
      return;
    }

    setLoading(true);
    setMessage("");
    setHasAttemptedSearch(true);

    try {
      const response = await fetch(
        `http://localhost:3000/api/users/search/${encodeURIComponent(searchQuery)}`,
        {
          headers: {
            "x-user-id": user.id,
            "x-user-role": user.role,
            "x-user": user.username,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to search users");
      }

      const data = await response.json();
      setUsers(data.users || []);
    } catch (err) {
      setMessage("Error searching users: " + err.message);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    const currentUser = users.find((u) => u.id === userId);
    if (!currentUser) return;

    // Check if the user is trying to delete themselves
    if (userId === user.id) {
      setMessage("You cannot delete your own account");
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to delete ${currentUser.name} ${currentUser.lastname}?`,
      )
    ) {
      return;
    }

    setDeleting(userId);
    setMessage("");

    try {
      const response = await fetch(
        `http://localhost:3000/api/users/${userId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": user.id,
            "x-user-role": user.role,
            "x-user": user.username,
          },
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete user");
      }

      // Remove the user from the list
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setMessage(
        `User ${currentUser.name} ${currentUser.lastname} has been deleted`,
      );
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage("Error deleting user: " + err.message);
    } finally {
      setDeleting(null);
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case "admin":
        return "#e74c3c";
      case "area_manager":
        return "#f39c12";
      case "user":
        return "#3498db";
      default:
        return "#95a5a6";
    }
  };

  const getRoleLabel = (role) => {
    const labels = {
      user: "User",
      area_manager: "Area Manager",
      admin: "Administrator",
    };
    return labels[role] || role;
  };

  // Admin-only component
  if (!isAdmin) {
    return (
      <div className="user-management-container">
        <div className="admin-only-message">
          <i className="fas fa-lock"></i>
          <h2>Access Denied</h2>
          <p>User management is only available to administrators</p>
        </div>
      </div>
    );
  }

  return (
    <div className="user-management-container">
      <div className="user-management-header">
        <h2>👥 User Management</h2>
        <p>Manage users in the system (view and delete only)</p>
      </div>

      <form onSubmit={handleSearch} className="search-form">
        <div className="search-input-group">
          <input
            type="text"
            placeholder="Search by name, lastname, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="search-button">
            <i className="fas fa-search"></i> Search
          </button>
        </div>
      </form>

      {message && (
        <div
          className={`message ${message.includes("Error") ? "error" : "success"}`}
        >
          {message}
        </div>
      )}

      {loading && (
        <div className="loading-container">
          <div className="loader"></div>
        </div>
      )}

      {!loading && users.length > 0 && (
        <div className="users-list">
          <h3>Search Results ({users.length})</h3>
          <div className="users-table">
            <div className="table-header">
              <div className="col-id">ID</div>
              <div className="col-name">Name</div>
              <div className="col-role">Role</div>
              <div className="col-actions">Actions</div>
            </div>

            {users.map((u) => (
              <div key={u.id} className="table-row">
                <div className="col-id">
                  <span className="id-badge">{u.username}</span>
                </div>
                <div className="col-name">
                  <div className="user-name">
                    {u.name} {u.lastname}
                  </div>
                  {u.title && <span className="user-subtitle">{u.title}</span>}
                </div>
                <div className="col-role">
                  <span
                    className="role-badge"
                    style={{ backgroundColor: getRoleColor(u.role) }}
                  >
                    {getRoleLabel(u.role)}
                  </span>
                </div>
                <div className="col-actions">
                  {u.id !== user.id ? (
                    <button
                      onClick={() => handleDeleteUser(u.id)}
                      disabled={deleting === u.id}
                      className="btn-delete"
                      title="Delete user"
                    >
                      {deleting === u.id ? (
                        <>
                          <span className="spinner"></span> Deleting...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-trash"></i> Delete
                        </>
                      )}
                    </button>
                  ) : (
                    <span className="current-user" title="This is you">
                      <i className="fas fa-user"></i> (You)
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && users.length === 0 && hasAttemptedSearch && (
        <div className="no-results">
          <i className="fas fa-search"></i>
          <p>No users found matching "{searchQuery}"</p>
        </div>
      )}

      {!loading && users.length === 0 && !hasAttemptedSearch && (
        <div className="empty-state">
          <i className="fas fa-users"></i>
          <p>Search for users to manage them</p>
        </div>
      )}
    </div>
  );
}
