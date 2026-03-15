import React, { useState, useEffect } from "react";
import "./EditPlantModal.css";

export default function EditPlantModal({ plant, onClose, onUpdate, user }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [wateringFreq, setWateringFreq] = useState("1");
  const [status, setStatus] = useState("healthy");
  const [soilMoisture, setSoilMoisture] = useState("");
  const [notes, setNotes] = useState("");
  const [lastWatered, setLastWatered] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (plant) {
      setName(plant.name || "");
      setType(plant.type || "");
      setWateringFreq(plant.watering_frequency_days || "1");
      setStatus(plant.status || "healthy");
      setSoilMoisture(plant.soil_moisture || "");
      setNotes(plant.notes || "");
      setLastWatered(
        plant.last_watered ? plant.last_watered.split(" ")[0] : "",
      );
    }
  }, [plant]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Plant name is required");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `http://localhost:3000/api/plants/${plant.id}`,
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
            type,
            lat: plant.lat,
            lng: plant.lng,
            wateringFrequencyDays: parseInt(wateringFreq),
            status,
            soilMoisture: soilMoisture ? parseInt(soilMoisture) : null,
            notes,
            lastWatered: lastWatered || null,
          }),
        },
      );

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to update plant");
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
          <h3>Edit Plant</h3>
          <button className="modal-close" onClick={onClose}>
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
              required
            />
          </div>

          <div className="form-group">
            <label>Plant Type</label>
            <input
              type="text"
              value={type}
              onChange={(e) => setType(e.target.value)}
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
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
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
            <label>Last Watered</label>
            <input
              type="date"
              value={lastWatered}
              onChange={(e) => setLastWatered(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows="3"
            />
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
              {loading ? "Updating..." : "Update Plant"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
