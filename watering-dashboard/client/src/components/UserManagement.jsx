import React, { useState, useEffect } from "react";
import "./UserManagement.css";
import { API_BASE_URL } from "../config";

export default function UserManagement({ user }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [togglingRole, setTogglingRole] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
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
        `${API_BASE_URL}/api/users/search/${encodeURIComponent(searchQuery)}`,
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

  const handleToggleRole = async (userId) => {
    const currentUser = users.find((u) => u.id === userId);
    if (!currentUser) return;

    // Check if the user is trying to change their own role
    if (userId === user.id) {
      setMessage("You cannot change your own role");
      return;
    }

    const newRole = currentUser.role === "admin" ? "user" : "admin";
    const confirmMessage =
      newRole === "admin"
        ? `Make ${currentUser.name} ${currentUser.lastname} an administrator?`
        : `Remove administrator status from ${currentUser.name} ${currentUser.lastname}?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setTogglingRole(userId);
    setMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}/role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id,
          "x-user-role": user.role,
          "x-user": user.username,
        },
        body: JSON.stringify({ newRole }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update user role");
      }

      // Update the user in the list
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)),
      );

      const actionText =
        newRole === "admin"
          ? "promoted to administrator"
          : "demoted to regular user";
      setMessage(
        `User ${currentUser.name} ${currentUser.lastname} has been ${actionText}`,
      );
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage("Error updating user role: " + err.message);
    } finally {
      setTogglingRole(null);
    }
  };

  const handleDeleteUser = async (userId) => {
    const currentUser = users.find((u) => u.id === userId);
    if (!currentUser) return;

    if (
      !window.confirm(
        `Delete user ${currentUser.name} ${currentUser.lastname}? This action cannot be undone.`,
      )
    ) {
      return;
    }

    setDeletingUser(userId);
    setMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id,
          "x-user-role": user.role,
          "x-user": user.username,
        },
      });

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
      setDeletingUser(null);
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case "admin":
        return "#e74c3c";
      case "user":
        return "#3498db";
      default:
        return "#95a5a6";
    }
  };

  const getRoleLabel = (role) => {
    const labels = {
      user: "User",
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
        <p>Manage users in the system (assign or remove administrator role)</p>
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
                <div className="col-actions">
                  {u.id !== user.id ? (
                    <div className="action-buttons">
                      <button
                        onClick={() => handleToggleRole(u.id)}
                        disabled={togglingRole === u.id}
                        className={`btn-action btn-role-toggle ${u.role === "admin" ? "btn-remove-admin" : "btn-make-admin"}`}
                        title={
                          u.role === "admin"
                            ? "Remove administrator"
                            : "Make administrator"
                        }
                      >
                        {togglingRole === u.id ? (
                          <>
                            <span className="spinner"></span> Updating...
                          </>
                        ) : u.role === "admin" ? (
                          <>
                            <i className="fas fa-shield-alt"></i> Remove Admin
                          </>
                        ) : (
                          <>
                            <i className="fas fa-crown"></i> Make Admin
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        disabled={deletingUser === u.id}
                        className="btn-action btn-delete-user"
                        title="Delete user"
                      >
                        {deletingUser === u.id ? (
                          <>
                            <span className="spinner"></span>
                          </>
                        ) : (
                          <i className="fas fa-trash"></i>
                        )}
                      </button>
                    </div>
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
