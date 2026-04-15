import React, { useState, useRef, useEffect } from "react";
import "./AddAreaButton.css";
import { API_BASE_URL } from "../config";

export default function AddAreaButton({ onAreaCreated, user }) {
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState("choice"); // 'choice', 'map', 'image'
  const [displayType, setDisplayType] = useState(null); // 'map' or 'image'
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [areaType, setAreaType] = useState("rectangle");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [drawnShape, setDrawnShape] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const drawnItemsRef = useRef(null);

  // Initialize map when step changes to 'map'
  useEffect(() => {
    if (step === "map" && mapRef.current) {
      if (drawnShape) {
        setDrawnShape(null);
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      initializeMap();
    }
  }, [step, areaType]); // eslint-disable-line react-hooks/exhaustive-deps

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
          polygon: areaType === "polygon",
          rectangle: areaType === "rectangle",
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
    } catch (e) {
      console.error("Map initialization error:", e);
      setError("Could not initialize map: " + e.message);
      mapInstanceRef.current = null;
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setStep("choice");
    setDisplayType(null);
    setName("");
    setDescription("");
    setAreaType("rectangle");
    setDrawnShape(null);
    setUploadedImage(null);
    setImagePreview(null);
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

    if (displayType === "map") {
      if (!drawnShape) {
        setError(
          `Please draw a ${areaType === "rectangle" ? "rectangle" : "polygon"} on the map`,
        );
        return;
      }
      submitMapArea();
    } else {
      if (!uploadedImage) {
        setError("Please select an image to upload");
        return;
      }
      submitImageArea();
    }
  };

  const submitMapArea = async () => {
    setLoading(true);
    try {
      const boundsJson =
        areaType === "rectangle"
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
          type: areaType,
          bounds_json: boundsJson,
          positions:
            areaType === "polygon"
              ? JSON.stringify(drawnShape.positions)
              : null,
          photo_display_type: "map",
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
      setAreaType("rectangle");
      setDrawnShape(null);
      handleCloseModal();
      setLoading(false);
      onAreaCreated();
    } catch (err) {
      setError("Connection error: " + err.message);
      setLoading(false);
    }
  };

  const submitImageArea = async () => {
    setLoading(true);
    try {
      // First create the area
      const createResponse = await fetch(`${API_BASE_URL}/api/areas`, {
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
          type: areaType,
          photo_display_type: "image",
        }),
      });

      if (!createResponse.ok) {
        const data = await createResponse.json();
        setError(data.error || "Failed to create area");
        setLoading(false);
        return;
      }

      const createData = await createResponse.json();
      const areaId = createData.areaId;

      // Then upload the image
      const formData = new FormData();
      formData.append("photo", uploadedImage);

      const uploadResponse = await fetch(
        `${API_BASE_URL}/api/areas/${areaId}/photo`,
        {
          method: "POST",
          headers: {
            "x-user": user.username,
            "x-user-id": user.id,
            "x-user-role": user.role,
          },
          body: formData,
        },
      );

      if (!uploadResponse.ok) {
        const data = await uploadResponse.json();
        setError(data.error || "Failed to upload image");
        setLoading(false);
        return;
      }

      setName("");
      setDescription("");
      setAreaType("rectangle");
      setUploadedImage(null);
      setImagePreview(null);
      handleCloseModal();
      setLoading(false);
      onAreaCreated();
    } catch (err) {
      setError("Connection error: " + err.message);
      setLoading(false);
    }
  };

  const handleChooseType = (type) => {
    setDisplayType(type);
    setError("");
    if (type === "map") {
      setStep("map");
    } else {
      setStep("image");
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setError("Only JPEG and PNG images are allowed.");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5MB.");
      return;
    }

    setError("");
    setUploadedImage(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
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
              <h3>
                {step === "choice"
                  ? "Create New Area"
                  : displayType === "map"
                    ? "Create Map Area"
                    : "Create Image Area"}
              </h3>
              <button
                className="add-area-modal-close"
                onClick={handleCloseModal}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {error && <div className="add-area-error-message">{error}</div>}

            {step === "choice" && (
              <div className="add-area-choice-container">
                <p>Choose how you want to represent this area:</p>
                <div className="add-area-choice-buttons">
                  <button
                    type="button"
                    className="add-area-choice-btn"
                    onClick={() => handleChooseType("map")}
                  >
                    <div className="choice-icon">🗺️</div>
                    <div className="choice-title">Map Area</div>
                    <div className="choice-desc">
                      Draw boundaries on a map to define the area
                    </div>
                  </button>
                  <button
                    type="button"
                    className="add-area-choice-btn"
                    onClick={() => handleChooseType("image")}
                  >
                    <div className="choice-icon">🖼️</div>
                    <div className="choice-title">Image Area</div>
                    <div className="choice-desc">
                      Upload an image to represent the area
                    </div>
                  </button>
                </div>
              </div>
            )}

            {step === "map" && (
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
                      <label>Map Type *</label>
                      <select
                        value={areaType}
                        onChange={(e) => setAreaType(e.target.value)}
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
                        onClick={() => {
                          setStep("choice");
                          setDisplayType(null);
                          setError("");
                        }}
                      >
                        Back
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
                      Use the drawing tools to create a {areaType} on the map.
                      This defines where plants can be placed.
                    </p>
                  </div>
                  <div ref={mapRef} className="add-area-map"></div>
                </div>
              </div>
            )}

            {step === "image" && (
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
                      <label>Upload Image (JPG/PNG, max 5MB) *</label>
                      <input
                        type="file"
                        accept="image/jpeg,image/png"
                        onChange={handleImageUpload}
                        required
                      />
                      {uploadedImage && (
                        <small style={{ display: "block", marginTop: "5px" }}>
                          ✓ {uploadedImage.name} selected
                        </small>
                      )}
                    </div>

                    <div className="add-area-modal-actions">
                      <button
                        type="button"
                        className="add-area-modal-btn add-area-modal-btn-cancel"
                        onClick={() => {
                          setStep("choice");
                          setDisplayType(null);
                          setError("");
                        }}
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        className="add-area-modal-btn add-area-modal-btn-primary"
                        disabled={loading || !uploadedImage}
                      >
                        {loading ? "Creating..." : "Create Area"}
                      </button>
                    </div>
                  </form>
                </div>

                <div className="add-area-form-right">
                  <div className="add-area-map-instructions">
                    <h4>🖼️ Image Preview</h4>
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="image-preview"
                      />
                    ) : (
                      <p>Image preview will appear here</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
