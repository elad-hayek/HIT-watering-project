import React, { useState } from "react";
import "./AddPlantButton.css";

export default function AddPlantButton({ areaId, onPlantCreated, user }) {
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [wateringFreq, setWateringFreq] = useState("1");
  const [status, setStatus] = useState("healthy");
  const [soilMoisture, setSoilMoisture] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Plant name is required");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://localhost:3000/api/plants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user": user.username,
          "x-user-id": user.id,
        },
        body: JSON.stringify({
          areaId,
          name,
          type,
          lat: 0,
          lng: 0,
          wateringFrequencyDays: parseInt(wateringFreq),
          status,
          soilMoisture: soilMoisture ? parseInt(soilMoisture) : null,
          notes,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to create plant");
        setLoading(false);
        return;
      }

      setName("");
      setType("");
      setWateringFreq("1");
      setStatus("healthy");
      setSoilMoisture("");
      setNotes("");
      setShowModal(false);
      setLoading(false);
      onPlantCreated();
    } catch (err) {
      setError("Connection error: " + err.message);
      setLoading(false);
    }
  };

  return (
    <>
      <button className="add-plant-btn" onClick={() => setShowModal(true)}>
        <i className="fas fa-plus"></i> Add Plant
      </button>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New Plant</h3>
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
                <label>Plant Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Rose Bush"
                  required
                />
              </div>

              <div className="form-group">
                <label>Plant Type</label>
                <input
                  type="text"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  placeholder="e.g., flowering plant"
                />
              </div>

              <div className="form-group">
                <label>Watering Frequency (days) *</label>
                <input
                  type="number"
                  value={wateringFreq}
                  onChange={(e) => setWateringFreq(e.target.value)}
                  min="1"
                  required
                />
              </div>

              <div className="form-group">
                <label>Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="healthy">Healthy</option>
                  <option value="needs_water">Needs Water</option>
                  <option value="diseased">Diseased</option>
                  <option value="dormant">Dormant</option>
                </select>
              </div>

              <div className="form-group">
                <label>Soil Moisture (%)</label>
                <input
                  type="number"
                  value={soilMoisture}
                  onChange={(e) => setSoilMoisture(e.target.value)}
                  min="0"
                  max="100"
                />
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes"
                  rows="2"
                />
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
                  {loading ? "Adding..." : "Add Plant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
