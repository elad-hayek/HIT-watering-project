import React, { useState, useEffect } from "react";
import "./AreaUsersModal.css";

export default function AreaUsersModal({ area, onClose, user }) {
  const [areaUsers, setAreaUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [hasAttemptedSearch, setHasAttemptedSearch] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState("read");
  const [updatingUser, setUpdatingUser] = useState(null);
  const [removingUser, setRemovingUser] = useState(null);
  const [addingUser, setAddingUser] = useState(null);

  // Load area users on mount
  useEffect(() => {
    loadAreaUsers();
  }, [area.id]);

  const loadAreaUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `http://localhost:3000/api/areas/${area.id}/users`,
        {
          headers: {
            "x-user-id": user.id,
            "x-user-role": user.role,
            "x-user": user.username,
          },
        },
      );
      const data = await res.json();
      setAreaUsers(data.users || []);
    } catch (err) {
      console.error("Error loading area users:", err);
      setMessage("Error loading users: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchUsers = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setHasAttemptedSearch(false);
      return;
    }

    setSearching(true);
    setHasAttemptedSearch(true);
    try {
      const res = await fetch(
        `http://localhost:3000/api/areas/${area.id}/users/search`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": user.id,
            "x-user-role": user.role,
            "x-user": user.username,
          },
          body: JSON.stringify({ query: searchQuery }),
        },
      );
      const data = await res.json();
      setSearchResults(data.users || []);
    } catch (err) {
      console.error("Error searching users:", err);
      setMessage("Error searching users: " + err.message);
    } finally {
      setSearching(false);
    }
  };

  const handleAddUser = async (userId) => {
    setAddingUser(userId);
    setMessage("");

    try {
      const res = await fetch(
        `http://localhost:3000/api/areas/${area.id}/users`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": user.id,
            "x-user-role": user.role,
            "x-user": user.username,
          },
          body: JSON.stringify({
            userId,
            permission: selectedPermission,
          }),
        },
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to add user");
      }

      await loadAreaUsers();
      setSearchQuery("");
      setSearchResults([]);
      setShowAddForm(false);
      setSelectedPermission("read");
      setMessage("User added successfully");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage("Error adding user: " + err.message);
    } finally {
      setAddingUser(null);
    }
  };

  const handleUpdatePermission = async (userId, newPermission) => {
    setUpdatingUser(userId);
    setMessage("");

    try {
      const res = await fetch(
        `http://localhost:3000/api/areas/${area.id}/users/${userId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": user.id,
            "x-user-role": user.role,
            "x-user": user.username,
          },
          body: JSON.stringify({
            permission: newPermission,
          }),
        },
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update permission");
      }

      await loadAreaUsers();
      setMessage("Permission updated successfully");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage("Error updating permission: " + err.message);
    } finally {
      setUpdatingUser(null);
    }
  };

  const handleRemoveUser = async (userId) => {
    const userToRemove = areaUsers.find((u) => u.id === userId);
    if (!userToRemove) return;

    if (userId === user.id) {
      setMessage("You cannot remove yourself from the area");
      return;
    }

    if (
      !window.confirm(
        `Remove ${userToRemove.name} ${userToRemove.lastname} from this area?`,
      )
    ) {
      return;
    }

    setRemovingUser(userId);
    setMessage("");

    try {
      const res = await fetch(
        `http://localhost:3000/api/areas/${area.id}/users/${userId}`,
        {
          method: "DELETE",
          headers: {
            "x-user-id": user.id,
            "x-user-role": user.role,
            "x-user": user.username,
          },
        },
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to remove user");
      }

      await loadAreaUsers();
      setMessage("User removed successfully");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage("Error removing user: " + err.message);
    } finally {
      setRemovingUser(null);
    }
  };

  const getPermissionDisplay = (permission) => {
    const map = {
      read: "📖 Read Only",
      update: "✏️ Editor",
      admin: "👨‍💼 Manager",
    };
    return map[permission] || permission;
  };

  const getPermissionColor = (permission) => {
    switch (permission) {
      case "update":
        return "#27ae60"; // Green for Editor
      case "admin":
        return "#e74c3c"; // Red for Manager
      case "read":
      default:
        return "#3498db"; // Blue for Read Only
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content area-users-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>👥 Manage Area Users - {area.name}</h3>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        {message && (
          <div
            className={`message ${message.includes("Error") ? "error" : "success"}`}
          >
            {message}
          </div>
        )}

        <div className="modal-body">
          {loading ? (
            <div className="loading-state">
              <div className="loader"></div>
              <p>Loading users...</p>
            </div>
          ) : (
            <>
              {/* Add User Section */}
              <div className="add-user-section">
                {!showAddForm ? (
                  <button
                    className="btn btn-primary"
                    onClick={() => setShowAddForm(true)}
                  >
                    <i className="fas fa-plus"></i> Add User to Area
                  </button>
                ) : (
                  <div className="add-user-form">
                    <form onSubmit={handleSearchUsers}>
                      <div className="form-group">
                        <input
                          type="text"
                          placeholder="Search user by name or ID..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="search-input"
                        />
                        <button
                          type="submit"
                          className="btn btn-sm btn-primary"
                        >
                          <i className="fas fa-search"></i>
                        </button>
                      </div>
                    </form>

                    {searching && <div className="loader"></div>}

                    {!searching && searchResults.length > 0 && (
                      <div className="search-results">
                        <div className="results-header">
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "12px",
                            }}
                          >
                            <span>Default Permission:</span>
                            <select
                              value={selectedPermission}
                              onChange={(e) =>
                                setSelectedPermission(e.target.value)
                              }
                              className="permission-select"
                            >
                              <option value="read">Read Only</option>
                              <option value="update">Editor</option>
                              <option value="admin">Manager</option>
                            </select>
                          </div>
                          <small className="permission-note">
                            Note: System admins will automatically be assigned
                            Editor or Manager permission regardless of selection
                          </small>
                        </div>
                        {searchResults.map((u) => (
                          <div key={u.id} className="search-result-item">
                            <div className="user-info">
                              <div className="user-name">
                                {u.name} {u.lastname}
                              </div>
                              <div className="user-meta">
                                ID: {u.username} | Role: {u.role}
                              </div>
                            </div>
                            <button
                              className="btn btn-sm btn-success"
                              onClick={() => handleAddUser(u.id)}
                              disabled={addingUser === u.id}
                            >
                              {addingUser === u.id ? (
                                <>
                                  <span className="spinner"></span> Adding...
                                </>
                              ) : (
                                <>
                                  <i className="fas fa-plus"></i> Add
                                </>
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {!searching &&
                      searchResults.length === 0 &&
                      hasAttemptedSearch && (
                        <div className="no-results-message">
                          <i className="fas fa-search"></i>
                          <p>No users found matching "{searchQuery}"</p>
                          <small>Try a different name or ID</small>
                        </div>
                      )}

                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => {
                        setShowAddForm(false);
                        setSearchQuery("");
                        setSearchResults([]);
                        setHasAttemptedSearch(false);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Users List */}
              <div className="users-list-section">
                <h4>Users in this Area ({areaUsers.length})</h4>

                {areaUsers.length === 0 ? (
                  <div className="no-users">
                    <i className="fas fa-inbox"></i>
                    <p>No users added to this area yet</p>
                  </div>
                ) : (
                  <div className="users-table">
                    {areaUsers.map((u) => (
                      <div key={u.id} className="user-row">
                        <div className="user-col-info">
                          <div className="user-name">
                            {u.name} {u.lastname}
                            {u.id === user.id && (
                              <span className="current-user">(You)</span>
                            )}
                          </div>
                          <div className="user-meta">
                            {u.username} • {u.role}
                          </div>
                        </div>

                        {!u.isFixedRole && (
                          <div className="user-col-permission">
                            <select
                              value={u.permission}
                              onChange={(e) =>
                                handleUpdatePermission(u.id, e.target.value)
                              }
                              className="permission-select"
                              disabled={updatingUser === u.id}
                              style={{
                                backgroundColor: getPermissionColor(
                                  u.permission,
                                ),
                                color: "white",
                                cursor: "pointer",
                              }}
                              title="Click to change user permission"
                            >
                              <option value="read">Read Only</option>
                              <option value="update">Editor</option>
                              <option value="admin">Manager</option>
                            </select>
                          </div>
                        )}

                        <div className="user-col-actions">
                          {u.id !== user.id ? (
                            <button
                              className="btn btn-icon btn-danger"
                              onClick={() => handleRemoveUser(u.id)}
                              disabled={removingUser === u.id}
                              title="Remove user from area"
                            >
                              {removingUser === u.id ? (
                                <span className="spinner"></span>
                              ) : (
                                <i className="fas fa-trash"></i>
                              )}
                            </button>
                          ) : (
                            <span className="no-action" title="This is you">
                              —
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
