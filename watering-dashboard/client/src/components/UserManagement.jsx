import React, { useState, useEffect } from "react";
import "./UserManagement.css";

export default function UserManagement({ user }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(null);
  const [message, setMessage] = useState("");
  const [selectedRole, setSelectedRole] = useState({});

  // Role options that can be assigned based on user's role
  const getRoleOptions = () => {
    const allRoles = [
      { value: "user", label: "User" },
      { value: "area_manager", label: "Area Manager" },
      { value: "admin", label: "Administrator" },
    ];

    return allRoles;
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setUsers([]);
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/users/search/${encodeURIComponent(searchQuery)}`,
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

      // Initialize selected roles with current roles
      const initialRoles = {};
      data.users.forEach((u) => {
        initialRoles[u.id] = u.role;
      });
      setSelectedRole(initialRoles);
    } catch (err) {
      setMessage("Error searching users: " + err.message);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (userId, newRole) => {
    setSelectedRole((prev) => ({
      ...prev,
      [userId]: newRole,
    }));
  };

  const handleUpdateRole = async (userId, newRole) => {
    const currentUser = users.find((u) => u.id === userId);
    if (!currentUser) return;

    // Check if the user is trying to change their own role
    if (userId === user.id) {
      setMessage("You cannot change your own role");
      return;
    }

    setUpdating(userId);
    setMessage("");

    try {
      const response = await fetch(`/api/users/${userId}/role`, {
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
        throw new Error(error.error || "Failed to update role");
      }

      // Update the user in the list
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                role: newRole,
              }
            : u,
        ),
      );

      setMessage(
        `Role updated for ${currentUser.name} ${currentUser.lastname}`,
      );
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage("Error updating role: " + err.message);
    } finally {
      setUpdating(null);
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

  return (
    <div className="user-management-container">
      <div className="user-management-header">
        <h2>User Management</h2>
        <p>Search for users and manage their roles</p>
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
              <div className="col-role">Current Role</div>
              <div className="col-new-role">New Role</div>
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
                <div className="col-new-role">
                  <select
                    value={selectedRole[u.id] || u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    className="role-select"
                    disabled={u.id === user.id}
                  >
                    {getRoleOptions().map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-actions">
                  {selectedRole[u.id] && selectedRole[u.id] !== u.role ? (
                    <button
                      onClick={() => handleUpdateRole(u.id, selectedRole[u.id])}
                      disabled={updating === u.id || u.id === user.id}
                      className="btn-update"
                    >
                      {updating === u.id ? (
                        <>
                          <span className="spinner"></span> Updating...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-check"></i> Update
                        </>
                      )}
                    </button>
                  ) : (
                    <span className="no-change">No change</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && users.length === 0 && searchQuery && (
        <div className="no-results">
          <i className="fas fa-search"></i>
          <p>No users found matching "{searchQuery}"</p>
        </div>
      )}

      {!loading && users.length === 0 && !searchQuery && (
        <div className="empty-state">
          <i className="fas fa-users"></i>
          <p>Search for users to manage their roles</p>
        </div>
      )}
    </div>
  );
}
