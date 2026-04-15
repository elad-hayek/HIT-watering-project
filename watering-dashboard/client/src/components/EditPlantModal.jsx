import React, { useState, useEffect } from "react";
import "./EditPlantModal.css";
import { API_BASE_URL } from "../config";

export default function EditPlantModal({ plant, onClose, onUpdate, user }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [wateringFreq, setWateringFreq] = useState("1");
  const [wateringVolume, setWateringVolume] = useState("");
  const [status, setStatus] = useState("healthy");
  const [soilMoisture, setSoilMoisture] = useState("");
  const [notes, setNotes] = useState("");
  const [lastWatered, setLastWatered] = useState("");
  const [imageXCoordinate, setImageXCoordinate] = useState("");
  const [imageYCoordinate, setImageYCoordinate] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Determine if this is an image-based plant
  const isImagePlant =
    plant?.image_x_coordinate != null && plant?.image_y_coordinate != null;

  useEffect(() => {
    if (plant) {
      setName(plant.name || "");
      setType(plant.type || "");
      setWateringFreq(plant.watering_frequency_days || "1");
      setWateringVolume(plant.watering_volume_liters || "");
      setStatus(plant.status || "healthy");
      setSoilMoisture(plant.soil_moisture || "");
      setNotes(plant.notes || "");
      setLastWatered(
        plant.last_watered ? plant.last_watered.split(" ")[0] : "",
      );
      setImageXCoordinate(plant.image_x_coordinate || "");
      setImageYCoordinate(plant.image_y_coordinate || "");
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
      const body = {
        name,
        type,
        wateringFrequencyDays: parseInt(wateringFreq),
        wateringVolumeLiters: wateringVolume
          ? parseFloat(wateringVolume)
          : null,
        status,
        soilMoisture: soilMoisture ? parseInt(soilMoisture) : null,
        notes,
        lastWatered: lastWatered || null,
      };

      // Include coordinates based on plant type
      if (isImagePlant) {
        body.imageXCoordinate = imageXCoordinate
          ? parseInt(imageXCoordinate)
          : null;
        body.imageYCoordinate = imageYCoordinate
          ? parseInt(imageYCoordinate)
          : null;
        body.lat = null;
        body.lng = null;
      } else {
        body.lat = plant.lat;
        body.lng = plant.lng;
      }

      const response = await fetch(`${API_BASE_URL}/api/plants/${plant.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user": user.username,
          "x-user-id": user.id,
          "x-user-role": user.role,
        },
        body: JSON.stringify(body),
      });

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
            <label>Watering Volume (liters)</label>
            <input
              type="number"
              value={wateringVolume}
              onChange={(e) => setWateringVolume(e.target.value)}
              min="0"
              step="0.1"
              placeholder="e.g., 2.5"
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

          {isImagePlant && (
            <>
              <div className="form-group">
                <label>Position X (pixels) *</label>
                <input
                  type="number"
                  value={imageXCoordinate}
                  onChange={(e) => setImageXCoordinate(e.target.value)}
                  min="0"
                  required
                />
              </div>

              <div className="form-group">
                <label>Position Y (pixels) *</label>
                <input
                  type="number"
                  value={imageYCoordinate}
                  onChange={(e) => setImageYCoordinate(e.target.value)}
                  min="0"
                  required
                />
              </div>

              <div className="info-message">
                💡 Edit the X and Y pixel coordinates above to reposition this
                plant on the image.
              </div>
            </>
          )}

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
