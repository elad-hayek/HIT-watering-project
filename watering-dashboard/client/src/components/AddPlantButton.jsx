import React, { useState, useEffect, useCallback } from "react";
import "./AddPlantButton.css";
import { API_BASE_URL } from "../config";

const parseJsonValue = (value) => {
  let parsed = value;
  for (let i = 0; i < 2 && typeof parsed === "string"; i++) {
    try {
      parsed = JSON.parse(parsed);
    } catch (_) {
      return null;
    }
  }
  return parsed;
};

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
  const [wateringVolume, setWateringVolume] = useState("");
  const [status, setStatus] = useState("healthy");
  const [soilMoisture, setSoilMoisture] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isImageArea = area?.photo_display_type === "image";
  const hasMapCoordinates =
    Number.isFinite(mapCoordinates?.lat) && Number.isFinite(mapCoordinates?.lng);
  const hasImageCoordinates =
    Number.isFinite(mapCoordinates?.imageX) &&
    Number.isFinite(mapCoordinates?.imageY);
  const hasValidCoordinates = isImageArea
    ? hasImageCoordinates
    : hasMapCoordinates;

  const getLocationDisplay = () => {
    if (isImageArea && hasImageCoordinates) {
      return `(${mapCoordinates.imageX}, ${mapCoordinates.imageY}) pixels`;
    }

    if (!isImageArea && hasMapCoordinates) {
      return `(${mapCoordinates.lat.toFixed(4)}, ${mapCoordinates.lng.toFixed(4)})`;
    }

    return "";
  };

  // Check if a point is inside a rectangle boundary
  const isPointInRectangle = (lat, lng, bounds) => {
    const [sw, ne] = bounds;
    const [swLat, swLng] = sw;
    const [neLat, neLng] = ne;
    const south = Math.min(swLat, neLat);
    const north = Math.max(swLat, neLat);
    const west = Math.min(swLng, neLng);
    const east = Math.max(swLng, neLng);
    return lat >= south && lat <= north && lng >= west && lng <= east;
  };

  // Check if a point is inside a polygon using ray casting algorithm
  const isPointInPolygon = (lat, lng, polygon) => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [lat1, lng1] = polygon[i];
      const [lat2, lng2] = polygon[j];
      const intersect =
        (lng1 > lng) !== (lng2 > lng) &&
        lat < ((lat2 - lat1) * (lng - lng1)) / (lng2 - lng1 || 1e-12) + lat1;
      if (intersect) inside = !inside;
    }
    return inside;
  };

  // Check if coordinates are within the area boundary
  const isWithinArea = useCallback(
    (lat, lng) => {
      if (!area || !area.bounds_json) return true; // Allow if no bounds defined

      try {
        const bounds = parseJsonValue(area.bounds_json);
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
    },
    [area],
  );

  // Clear error when modal opens for a fresh state
  useEffect(() => {
    if (showModal && !hasValidCoordinates) {
      setError(""); // Clear error when opening modal without a location
    }
  }, [showModal, hasValidCoordinates]);

  // Validate coordinates only after they've been set (user clicked map or image)
  useEffect(() => {
    if (mapCoordinates) {
      if (!hasValidCoordinates) {
        setError("");
        return;
      }

      // Only validate map area boundaries for GPS coordinates
      if (!isImageArea && hasMapCoordinates) {
        if (!isWithinArea(mapCoordinates.lat, mapCoordinates.lng)) {
          setError(
            "❌ Plant location is OUTSIDE the area boundary. Please click inside the area on the map.",
          );
        } else {
          setError(""); // Clear error if coordinates are valid
        }
      } else if (isImageArea && hasImageCoordinates) {
        // Image area coordinates - validate against image dimensions
        if (
          area?.photo_width &&
          area?.photo_height
        ) {
          if (
            mapCoordinates.imageX < 0 ||
            mapCoordinates.imageX > area.photo_width ||
            mapCoordinates.imageY < 0 ||
            mapCoordinates.imageY > area.photo_height
          ) {
            setError(
              `❌ Plant location (${mapCoordinates.imageX}, ${mapCoordinates.imageY}) is OUTSIDE the image bounds (${area.photo_width}x${area.photo_height}px). Please click inside the image.`,
            );
          } else {
            setError("");
          }
        } else {
          setError("");
        }
      } else {
        setError("");
      }
    }
  }, [
    mapCoordinates,
    area,
    isWithinArea,
    isImageArea,
    hasMapCoordinates,
    hasImageCoordinates,
    hasValidCoordinates,
  ]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Plant name is required");
      return;
    }

    if (!hasValidCoordinates) {
      if (isImageArea) {
        setError("Please click on the image to set the plant location first");
      } else {
        setError("Please click on the map to set the plant location first");
      }
      return;
    }

    // For map areas, check if coordinates are within area bounds
    if (
      !isImageArea &&
      hasMapCoordinates
    ) {
      if (!isWithinArea(mapCoordinates.lat, mapCoordinates.lng)) {
        setError(
          "Plant location must be within the area boundary. Please select a location inside the area.",
        );
        return;
      }
    }

    // For image areas, check if coordinates are within image bounds
    if (
      isImageArea &&
      hasImageCoordinates
    ) {
      if (area?.photo_width && area?.photo_height) {
        if (
          mapCoordinates.imageX < 0 ||
          mapCoordinates.imageX > area.photo_width ||
          mapCoordinates.imageY < 0 ||
          mapCoordinates.imageY > area.photo_height
        ) {
          setError(
            `Plant location (${mapCoordinates.imageX}, ${mapCoordinates.imageY}) must be within the image bounds (${area.photo_width}x${area.photo_height}px). Please click inside the image.`,
          );
          return;
        }
      }
    }

    setLoading(true);

    try {
      const body = {
        areaId,
        name,
        type,
        wateringFrequencyDays: parseInt(wateringFreq),
        wateringVolumeLiters: wateringVolume
          ? parseFloat(wateringVolume)
          : null,
        status,
        soilMoisture: soilMoisture ? parseInt(soilMoisture) : null,
        notes,
      };

      // Add coordinates based on area type and what was captured
      if (
        isImageArea &&
        hasImageCoordinates
      ) {
        // Image area: use pixel coordinates
        body.imageXCoordinate = mapCoordinates.imageX;
        body.imageYCoordinate = mapCoordinates.imageY;
        body.lat = null;
        body.lng = null;
      } else if (!isImageArea && hasMapCoordinates) {
        // Map area: use lat/lng coordinates
        body.lat = mapCoordinates.lat;
        body.lng = mapCoordinates.lng;
      } else {
        // Neither coordinate type captured properly
        setError("Unable to determine location. Please try again.");
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/plants`, {
        method: "POST",
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
        setError(data.error || "Failed to create plant");
        setLoading(false);
        return;
      }

      setName("");
      setType("");
      setWateringFreq("1");
      setWateringVolume("");
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

            {!hasValidCoordinates ? (
              <div className="info-message">
                ℹ️ Please close this form, click on the{" "}
                {isImageArea ? "image" : "map"} to mark
                the plant location, then click "Add Plant" again to fill in the
                details
              </div>
            ) : !error?.includes("OUTSIDE") ? (
              <>
                <div className="success-message">
                  ✓ Location selected: {getLocationDisplay()}
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
