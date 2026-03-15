import React, { useState, useEffect } from "react";
import "./EditAreaModal.css";

export default function EditAreaModal({ area, onClose, onUpdate, user }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("rectangle");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (area) {
      setName(area.name || "");
      setDescription(area.description || "");
      setType(area.type || "rectangle");
    }
  }, [area]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Area name is required");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `http://localhost:3000/api/areas/${area.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-user": user.username,
            "x-user-id": user.id,
            "x-user-role": user.role,
          },
          body: JSON.stringify({
            name,
            description,
            type,
            bounds_json: area.bounds_json,
            positions: area.positions,
          }),
        },
      );

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to update area");
        setLoading(false);
        return;
      }

      setLoading(false);
      onUpdate();
    } catch (err) {
      setError("Connection error: " + err.message);
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit Area</h3>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Area Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="3"
            />
          </div>

          <div className="form-group">
            <label>Area Type *</label>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="rectangle">Rectangle</option>
              <option value="polygon">Polygon</option>
            </select>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? "Updating..." : "Update Area"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
