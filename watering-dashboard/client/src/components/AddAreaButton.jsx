import React, { useState, useRef, useEffect } from "react";
import "./AddAreaButton.css";
import { API_BASE_URL } from "../config";

export default function AddAreaButton({ onAreaCreated, user }) {
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("rectangle");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [drawnShape, setDrawnShape] = useState(null);
  const [mapInitialized, setMapInitialized] = useState(false);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const drawnItemsRef = useRef(null);

  // Initialize map when modal opens or type changes
  useEffect(() => {
    if (showModal) {
      document.documentElement.setAttribute("data-add-area-modal-open", "true");
      if (mapRef.current) {
        // If shape already drawn and type changes, clear the shape and reinit
        if (drawnShape) {
          setDrawnShape(null);
        }
        // Always reinitialize map when type changes
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
          setMapInitialized(false);
        }
        // Reinitialize with new type
        initializeMap();
      }
    } else {
      document.documentElement.removeAttribute("data-add-area-modal-open");
    }
  }, [showModal, type]);

  const initializeMap = () => {
    try {
      const L = window.L;
      if (!L) {
        setError("Leaflet library not loaded");
        return;
      }

      // Always clear existing map completely
      if (mapInstanceRef.current) {
        // Remove all layers first
        mapInstanceRef.current.eachLayer((layer) => {
          mapInstanceRef.current.removeLayer(layer);
        });
        // Then remove the map
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // Clear the DOM container
      if (mapRef.current) {
        mapRef.current.innerHTML = "";
      }

      const map = L.map(mapRef.current, { maxBounds: null }).setView(
        [31.7683, 35.2137],
        13,
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      // Create feature group for drawn items
      const drawnItems = new L.FeatureGroup();
      map.addLayer(drawnItems);
      drawnItemsRef.current = drawnItems;

      // Initialize Leaflet Draw
      const drawControl = new L.Control.Draw({
        position: "topright",
        draw: {
          polygon: type === "polygon",
          rectangle: type === "rectangle",
          polyline: false,
          circle: false,
          circlemarker: false,
          marker: false,
        },
        edit: {
          featureGroup: drawnItems,
          edit: false,
          remove: true,
        },
      });
      map.addControl(drawControl);

      // Handle drawing events
      map.on("draw:created", (e) => {
        const layer = e.layer;
        drawnItems.clearLayers();
        drawnItems.addLayer(layer);

        // Extract coordinates
        if (layer instanceof L.Rectangle) {
          const bounds = layer.getBounds();
          const swCorner = bounds.getSouthWest();
          const neCorner = bounds.getNorthEast();
          setDrawnShape({
            type: "rectangle",
            bounds: [
              [swCorner.lat, swCorner.lng],
              [neCorner.lat, neCorner.lng],
            ],
          });
        } else if (layer instanceof L.Polygon) {
          const coords = layer.getLatLngs()[0];
          const positions = coords.map((latlng) => [latlng.lat, latlng.lng]);
          setDrawnShape({
            type: "polygon",
            positions: positions,
          });
        }
      });

      map.on("draw:edited", (e) => {
        const layers = e.layers;
        layers.eachLayer((layer) => {
          if (layer instanceof L.Rectangle) {
            const bounds = layer.getBounds();
            const swCorner = bounds.getSouthWest();
            const neCorner = bounds.getNorthEast();
            setDrawnShape({
              type: "rectangle",
              bounds: [
                [swCorner.lat, swCorner.lng],
                [neCorner.lat, neCorner.lng],
              ],
            });
          } else if (layer instanceof L.Polygon) {
            const coords = layer.getLatLngs()[0];
            const positions = coords.map((latlng) => [latlng.lat, latlng.lng]);
            setDrawnShape({
              type: "polygon",
              positions: positions,
            });
          }
        });
      });

      map.on("draw:deleted", () => {
        setDrawnShape(null);
      });

      mapInstanceRef.current = map;
      setMapInitialized(true);
    } catch (e) {
      console.error("Map initialization error:", e);
      setError("Could not initialize map: " + e.message);
      mapInstanceRef.current = null;
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setMapInitialized(false);
    setDrawnShape(null);
    setError("");
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Area name is required");
      return;
    }

    if (!drawnShape) {
      setError(
        `Please draw a ${type === "rectangle" ? "rectangle" : "polygon"} on the map`,
      );
      return;
    }

    setLoading(true);

    try {
      const boundsJson =
        type === "rectangle"
          ? JSON.stringify(drawnShape.bounds)
          : JSON.stringify(drawnShape.positions);

      const response = await fetch(`${API_BASE_URL}/api/areas`, {
        method: "POST",
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
          bounds_json: boundsJson,
          positions:
            type === "polygon" ? JSON.stringify(drawnShape.positions) : null,
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
      setDrawnShape(null);
      handleCloseModal();
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
        <div className="add-area-modal-overlay" onClick={handleCloseModal}>
          <div
            className="add-area-modal-wrapper"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="add-area-modal-header">
              <h3>Create New Area</h3>
              <button
                className="add-area-modal-close"
                onClick={handleCloseModal}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {error && <div className="add-area-error-message">{error}</div>}

            <div className="add-area-form-container">
              <div className="add-area-form-left">
                <form onSubmit={handleSubmit}>
                  <div className="add-area-form-group">
                    <label>Area Name *</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., South Garden"
                      required
                    />
                  </div>

                  <div className="add-area-form-group">
                    <label>Description</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Optional description"
                      rows="3"
                    />
                  </div>

                  <div className="add-area-form-group">
                    <label>Area Type *</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                    >
                      <option value="rectangle">Rectangle</option>
                      <option value="polygon">Polygon</option>
                    </select>
                    <small style={{ display: "block", marginTop: "5px" }}>
                      {drawnShape
                        ? "✓ Shape drawn on map"
                        : "⚠ Draw a shape on the map →"}
                    </small>
                  </div>

                  <div className="add-area-modal-actions">
                    <button
                      type="button"
                      className="add-area-modal-btn add-area-modal-btn-cancel"
                      onClick={handleCloseModal}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="add-area-modal-btn add-area-modal-btn-primary"
                      disabled={loading || !drawnShape}
                    >
                      {loading ? "Creating..." : "Create Area"}
                    </button>
                  </div>
                </form>
              </div>

              <div className="add-area-form-right">
                <div className="add-area-map-instructions">
                  <h4>🗺️ Draw Area Boundary</h4>
                  <p>
                    Use the drawing tools to create a {type} on the map. This
                    defines where plants can be placed.
                  </p>
                </div>
                <div ref={mapRef} className="add-area-map"></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
