import React, { useState } from "react";
import "./AddAreaButton.css";

export default function AddAreaButton({ onAreaCreated, user }) {
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("rectangle");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Area name is required");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://localhost:3000/api/areas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user": user.username,
          "x-user-id": user.id,
        },
        body: JSON.stringify({
          name,
          description,
          type,
          bounds_json: null,
          positions: null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to create area");
        setLoading(false);
        return;
      }

      setName("");
      setDescription("");
      setType("rectangle");
      setShowModal(false);
      setLoading(false);
      onAreaCreated();
    } catch (err) {
      setError("Connection error: " + err.message);
      setLoading(false);
    }
  };

  return (
    <>
      <button className="add-area-btn" onClick={() => setShowModal(true)}>
        <i className="fas fa-plus"></i>
      </button>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Area</h3>
              <button
                className="modal-close"
                onClick={() => setShowModal(false)}
              >
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
                  placeholder="e.g., South Garden"
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description"
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
                <button
                  type="button"
                  className="btn btn-cancel"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? "Creating..." : "Create Area"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
