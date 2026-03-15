import React, { useState, useEffect } from "react";
import "./notification.css";

export default function Notification({ user }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
    // Refresh logs every 30 seconds
    const interval = setInterval(loadLogs, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const loadLogs = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/audit?limit=50", {
        headers: {
          "x-user-id": user.id,
          "x-user-role": user.role,
          "x-user": user.username,
        },
      });
      const data = await res.json();
      setLogs(data.logs || []);
      setLoading(false);
    } catch (err) {
      console.error("Error loading logs:", err);
      setLoading(false);
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case "user_login":
        return "fas fa-sign-in-alt";
      case "user_register":
        return "fas fa-user-plus";
      case "area_create":
        return "fas fa-folder-plus";
      case "area_update":
        return "fas fa-edit";
      case "area_delete":
        return "fas fa-trash";
      case "plant_create":
        return "fas fa-leaf";
      case "plant_update":
        return "fas fa-leaf";
      case "plant_delete":
        return "fas fa-trash";
      default:
        return "fas fa-bell";
    }
  };

  const getActionColor = (action) => {
    if (action.includes("login") || action.includes("register"))
      return "#2196f3";
    if (action.includes("create")) return "#4caf50";
    if (action.includes("update")) return "#ff9800";
    if (action.includes("delete")) return "#f44336";
    return "#9e9e9e";
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString();
  };

  if (loading) {
    return (
      <div className="notification-loading">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div className="notification-container">
      <div className="notification-header">
        <h2>
          <i className="fas fa-bell"></i> Activity Log
        </h2>
        <button className="btn btn-refresh" onClick={loadLogs}>
          <i className="fas fa-sync-alt"></i> Refresh
        </button>
      </div>

      {logs.length === 0 ? (
        <div className="no-logs">
          <i className="fas fa-inbox"></i>
          <p>No activity yet</p>
        </div>
      ) : (
        <div className="logs-list">
          {logs.map((log, index) => (
            <div key={log.id || index} className="log-item">
              <div
                className="log-icon"
                style={{ color: getActionColor(log.action) }}
              >
                <i className={getActionIcon(log.action)}></i>
              </div>
              <div className="log-content">
                <h4>{log.action.replaceAll("_", " ").toUpperCase()}</h4>
                <p>
                  <strong>Actor:</strong> {log.actor}
                </p>
                {log.entity_type && (
                  <p>
                    <strong>Entity:</strong> {log.entity_type} (ID:{" "}
                    {log.entity_id})
                  </p>
                )}
                {log.ip_address && (
                  <p>
                    <strong>IP:</strong> {log.ip_address}
                  </p>
                )}
                {log.details && (
                  <p>
                    <strong>Details:</strong> {JSON.stringify(log.details)}
                  </p>
                )}
                <span className="log-time">
                  <i className="fas fa-clock"></i> {formatDate(log.created_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
