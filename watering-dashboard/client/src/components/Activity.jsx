import React, { useState, useEffect, useRef, useCallback } from "react";
import { FixedSizeList as List } from "react-window";
import "./Activity.css";

export default function Activity({ user }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [filterUser, setFilterUser] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [users, setUsers] = useState([]);
  const [actions, setActions] = useState([]);
  const [listHeight, setListHeight] = useState(window.innerHeight - 100);
  const observerTarget = useRef(null);

  // Update height on window resize
  useEffect(() => {
    const handleResize = () => {
      setListHeight(window.innerHeight - 100);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Check if user is admin
  const isAdmin =
    user?.title === "Administrator" || user?.username === "340969674";

  // Fetch logs
  const fetchLogs = useCallback(
    async (newOffset = 0) => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.append("limit", 30);
        params.append("offset", newOffset);
        if (filterUser) params.append("user", filterUser);
        if (filterAction) params.append("action", filterAction);

        const res = await fetch(
          `http://localhost:3000/api/audit/logs?${params}`,
          {
            headers: {
              "x-user": user.username,
              "x-user-id": user.id,
              "x-user-role": user.role,
            },
          },
        );

        if (!res.ok) throw new Error("Failed to fetch logs");

        const data = await res.json();

        if (newOffset === 0) {
          setLogs(data.logs);
        } else {
          setLogs((prev) => [...prev, ...data.logs]);
        }

        // HasMore is true only if we got a full page of results
        // If we got fewer than 30 items, we've reached the end
        setHasMore(data.logs.length === 30);
      } catch (err) {
        console.error("Error fetching logs:", err);
      } finally {
        setLoading(false);
      }
    },
    [user.username, filterUser, filterAction],
  );

  // Fetch available users and actions for filters
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const res = await fetch("http://localhost:3000/api/audit/filters", {
          headers: {
            "x-user": user.username,
            "x-user-id": user.id,
            "x-user-role": user.role,
          },
        });
        if (res.ok) {
          const data = await res.json();
          setUsers(data.users || []);
          setActions(data.actions || []);
        }
      } catch (err) {
        console.error("Error fetching filter options:", err);
      }
    };

    fetchFilterOptions();
  }, [user.username]);

  // Initial load
  useEffect(() => {
    setLogs([]);
    setHasMore(true);
    fetchLogs(0);
  }, [filterUser, filterAction]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMore &&
          !loading &&
          logs.length > 0
        ) {
          const newOffset = logs.length;
          fetchLogs(newOffset);
        }
      },
      { threshold: 0.1 },
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, loading, logs.length, fetchLogs]);

  if (!isAdmin) {
    return (
      <div className="activity-access-denied">
        <i className="fas fa-lock"></i>
        <h2>Access Denied</h2>
        <p>Only administrators can view the Activity tab.</p>
      </div>
    );
  }

  const getActionIcon = (action) => {
    const iconMap = {
      user_register: "fas fa-user-plus",
      user_login: "fas fa-sign-in-alt",
      user_login_failed: "fas fa-exclamation-circle",
      area_create: "fas fa-plus-circle",
      area_update: "fas fa-edit",
      area_delete: "fas fa-trash",
      plant_create: "fas fa-spa",
      plant_update: "fas fa-edit",
      plant_delete: "fas fa-trash",
    };
    return iconMap[action] || "fas fa-circle";
  };

  const getActionLabel = (action) => {
    return action
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const getActionColor = (action) => {
    if (action.includes("create")) return "#4caf50";
    if (action.includes("update")) return "#2196f3";
    if (action.includes("delete")) return "#f44336";
    if (action.includes("login")) return "#ff9800";
    if (action.includes("failed")) return "#f44336";
    return "#2d5016";
  };

  const getActionDescription = (action, details) => {
    if (!details) {
      return getActionLabel(action);
    }

    // Parse details if it's a JSON string
    let parsedDetails = details;
    if (typeof details === "string") {
      try {
        parsedDetails = JSON.parse(details);
      } catch {
        return getActionLabel(action);
      }
    }

    const descriptions = {
      user_register: (d) => `User registered: ${d.username}`,
      user_login: (d) => `Logged in successfully`,
      user_login_failed: (d) =>
        `Login attempt failed - ${d.reason || "invalid credentials"}`,
      area_create: (d) => `Created a new area: "${d.name}" (${d.type})`,
      area_update: (d) => `Updated area: "${d.name}"`,
      area_delete: (d) => `Deleted area: "${d.name}"`,
      plant_create: (d) => `Created a new plant: "${d.name}" of type ${d.type}`,
      plant_update: (d) => `Updated plant: "${d.name}"`,
      plant_delete: (d) => `Deleted plant: "${d.name}"`,
    };

    const descFn = descriptions[action];
    if (descFn && typeof descFn === "function") {
      try {
        return descFn(parsedDetails);
      } catch {
        return getActionLabel(action);
      }
    }

    return getActionLabel(action);
  };

  return (
    <div className="activity-container">
      <div className="activity-sidebar">
        <div className="activity-header">
          <h1>
            <i className="fas fa-history"></i> Activity Logs
          </h1>
          <p>View audit logs for all areas and actions in the system</p>
        </div>

        <div className="activity-filters">
          <div className="filter-group">
            <label htmlFor="filterUser">Filter by User:</label>
            <select
              id="filterUser"
              value={filterUser}
              onChange={(e) => {
                setFilterUser(e.target.value);
              }}
              className="filter-select"
            >
              <option value="">All Users</option>
              {users.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="filterAction">Filter by Action:</label>
            <select
              id="filterAction"
              value={filterAction}
              onChange={(e) => {
                setFilterAction(e.target.value);
              }}
              className="filter-select"
            >
              <option value="">All Actions</option>
              {actions.map((a) => (
                <option key={a} value={a}>
                  {getActionLabel(a)}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-info">
            <span>{logs.length} logs loaded</span>
          </div>
        </div>
      </div>

      <div className="activity-logs">
        {logs.length === 0 && !loading ? (
          <div className="no-logs">
            <i className="fas fa-inbox"></i>
            <p>No activity logs found</p>
          </div>
        ) : (
          <div className="logs-list-container">
            <List
              height={listHeight}
              itemCount={logs.length}
              itemSize={100}
              width="100%"
            >
              {({ index, style }) => {
                const log = logs[index];
                return (
                  <div style={style} className="log-entry-wrapper">
                    <div className="log-entry">
                      <div
                        className="log-icon"
                        style={{
                          backgroundColor: getActionColor(log.action),
                        }}
                      >
                        <i className={getActionIcon(log.action)}></i>
                      </div>
                      <div className="log-content">
                        <div className="log-header">
                          <div className="log-action-title">
                            <strong>
                              {getActionDescription(log.action, log.details)}
                            </strong>
                          </div>
                          <div className="log-timestamp">
                            {new Date(log.created_at).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                              },
                            )}{" "}
                            {new Date(log.created_at).toLocaleTimeString(
                              "en-US",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                              },
                            )}
                          </div>
                        </div>

                        <div className="log-meta-info">
                          <div className="meta-item">
                            <i className="fas fa-user"></i>
                            <span className="meta-label">User:</span>
                            <span className="meta-value">
                              {log.actor || "System"}
                            </span>
                          </div>
                          {log.ip_address && (
                            <div className="meta-item">
                              <i className="fas fa-globe"></i>
                              <span className="meta-label">IP:</span>
                              <span className="meta-value">
                                {log.ip_address}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }}
            </List>

            {loading && (
              <div className="logs-loading-inline">
                <div className="loader"></div>
                <p>Loading more logs...</p>
              </div>
            )}

            {/* Observer target is always rendered so the message only shows when user scrolls to the bottom */}
            <div ref={observerTarget} className="observer-target"></div>
          </div>
        )}
      </div>
    </div>
  );
}
