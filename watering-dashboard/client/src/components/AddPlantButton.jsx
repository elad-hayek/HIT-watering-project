import React, { useState, useEffect } from "react";
import "./AddPlantButton.css";
import { API_BASE_URL } from "../config";

export default function AddPlantButton({
  areaId,
  area,
  onPlantCreated,
  user,
  mapCoordinates,
  onMapCoordinatesUsed,
}) {
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [wateringFreq, setWateringFreq] = useState("1");
  const [status, setStatus] = useState("healthy");
  const [soilMoisture, setSoilMoisture] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Check if a point is inside a rectangle boundary
  const isPointInRectangle = (lat, lng, bounds) => {
    const [sw, ne] = bounds;
    const [swLat, swLng] = sw;
    const [neLat, neLng] = ne;
    return lat >= swLat && lat <= neLat && lng >= swLng && lng <= neLng;
  };

  // Check if a point is inside a polygon using ray casting algorithm
  const isPointInPolygon = (lat, lng, polygon) => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [lat1, lng1] = polygon[i];
      const [lat2, lng2] = polygon[j];
      const intersect =
        lng > Math.min(lng1, lng2) &&
        lng <= Math.max(lng1, lng2) &&
        lat <= Math.max(lat1, lat2) &&
        (lng1 === lng2 ||
          lat < ((lat2 - lat1) * (lng - lng1)) / (lng2 - lng1) + lat1);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  // Check if coordinates are within the area boundary
  const isWithinArea = (lat, lng) => {
    if (!area || !area.bounds_json) return true; // Allow if no bounds defined

    try {
      const bounds = JSON.parse(area.bounds_json);
      if (!bounds) return true;

      if (area.type === "rectangle" && bounds.length === 2) {
        return isPointInRectangle(lat, lng, bounds);
      } else if (area.type === "polygon" && Array.isArray(bounds[0])) {
        return isPointInPolygon(lat, lng, bounds);
      }
      return true;
    } catch (e) {
      console.error("Error checking bounds:", e);
      return true; // Allow if error parsing bounds
    }
  };

  // Clear error when modal opens for a fresh state
  useEffect(() => {
    if (showModal && !mapCoordinates) {
      setError(""); // Clear error when opening modal without a location
    }
  }, [showModal]);

  // Validate coordinates only after they've been set (user clicked map)
  useEffect(() => {
    if (mapCoordinates) {
      if (!isWithinArea(mapCoordinates.lat, mapCoordinates.lng)) {
        setError(
          "❌ Plant location is OUTSIDE the area boundary. Please click inside the area on the map.",
        );
      } else {
        setError(""); // Clear error if coordinates are valid
      }
    }
  }, [mapCoordinates, area]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Plant name is required");
      return;
    }

    if (!mapCoordinates) {
      setError("Please click on the map to set the plant location first");
      return;
    }

    // Check if coordinates are within area bounds
    if (!isWithinArea(mapCoordinates.lat, mapCoordinates.lng)) {
      setError(
        "Plant location must be within the area boundary. Please select a location inside the area.",
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/plants`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user": user.username,
          "x-user-id": user.id,
          "x-user-role": user.role,
        },
        body: JSON.stringify({
          areaId,
          name,
          type,
          lat: mapCoordinates.lat,
          lng: mapCoordinates.lng,
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
      if (onMapCoordinatesUsed) {
        onMapCoordinatesUsed();
      }
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

            {!mapCoordinates ? (
              <div className="info-message">
                ℹ️ Please close this form, click on the map to mark the plant
                location, then click "Add Plant" again to fill in the details
              </div>
            ) : !error?.includes("OUTSIDE") ? (
              <>
                <div className="success-message">
                  ✓ Location selected on map: ({mapCoordinates.lat.toFixed(4)},
                  {mapCoordinates.lng.toFixed(4)})
                </div>

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
              </>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
