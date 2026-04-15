import React, { useRef, useEffect, useState } from "react";
import "./AreaDetailMap.css";
import { getStatusDisplay } from "../utils/statusMapping";
import { API_BASE_URL } from "../config";

export default function AreaDetailMap({ area, plants, user, onMapClick }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const clickMarkerRef = useRef(null);
  const plantsMarkersRef = useRef([]);
  const imageContainerRef = useRef(null);
  const [clickedPlant, setClickedPlant] = useState(null);
  const [newPlantPosition, setNewPlantPosition] = useState(null);
  const [boundaryError, setBoundaryError] = useState("");

  // Handle image area clicks for plant placement
  const handleImageClick = (e) => {
    if (area?.photo_display_type !== "image" || !imageContainerRef.current)
      return;

    // Find the actual img element within the container
    const imgElement = imageContainerRef.current.querySelector(".area-image");
    if (!imgElement) return;

    // Get bounding rectangles for click position calculation
    const containerRect = imageContainerRef.current.getBoundingClientRect();
    const imgRect = imgElement.getBoundingClientRect();

    // Calculate click position relative to the img element (in display pixels)
    const clickDisplayX = e.clientX - imgRect.left;
    const clickDisplayY = e.clientY - imgRect.top;

    // Check if click is within the visible image bounds
    if (
      clickDisplayX < 0 ||
      clickDisplayX > imgRect.width ||
      clickDisplayY < 0 ||
      clickDisplayY > imgRect.height
    ) {
      setBoundaryError(
        `❌ Click is outside the image bounds. Please click within the visible image area.`,
      );
      setNewPlantPosition(null);
      return;
    }

    // Calculate scale factors to normalize from display pixels to original image dimensions
    // The image is scaled by CSS (max-width, max-height, object-fit: contain)
    const scaleX = imgElement.naturalWidth / imgRect.width;
    const scaleY = imgElement.naturalHeight / imgRect.height;

    // Convert display pixel coordinates to original image coordinates
    const originalX = Math.round(clickDisplayX * scaleX);
    const originalY = Math.round(clickDisplayY * scaleY);

    // Validate that normalized coordinates are within original image dimensions
    if (
      originalX < 0 ||
      originalX > area?.photo_width ||
      originalY < 0 ||
      originalY > area?.photo_height
    ) {
      setBoundaryError(
        `❌ Plant location (${originalX}, ${originalY}) is OUTSIDE the image bounds (${area?.photo_width}x${area?.photo_height}px). Please click inside the image.`,
      );
      setNewPlantPosition(null);
      return;
    }

    // Valid coordinates - clear error and store DISPLAY position for rendering
    // (convert back to display coordinates for visual marker placement)
    setBoundaryError("");
    setNewPlantPosition({
      x: Math.round(clickDisplayX),
      y: Math.round(clickDisplayY),
    });

    if (onMapClick) {
      // Pass ORIGINAL image coordinates to parent (for API)
      onMapClick({ imageX: originalX, imageY: originalY });
    }
  };

  // Handle plant marker click on image
  const handlePlantMarkerClick = (plant, e) => {
    e.stopPropagation();
    setClickedPlant(clickedPlant?.id === plant.id ? null : plant);
  };

  // Render plant markers overlay on image
  const renderPlantMarkers = () => {
    if (
      area?.photo_display_type !== "image" ||
      !plants ||
      plants.length === 0
    ) {
      return null;
    }

    return plants
      .filter(
        (plant) =>
          plant.image_x_coordinate != null && plant.image_y_coordinate != null,
      )
      .map((plant) => {
        const color =
          plant.status === "healthy"
            ? "#4caf50"
            : plant.status === "needs_water"
              ? "#ff9800"
              : plant.status === "diseased"
                ? "#f44336"
                : "#9e9e9e";

        return (
          <div
            key={plant.id}
            className={`plant-marker ${clickedPlant?.id === plant.id ? "clicked" : ""}`}
            style={{
              position: "absolute",
              left: `${plant.image_x_coordinate}px`,
              top: `${plant.image_y_coordinate}px`,
              transform: "translate(-50%, -50%)",
              cursor: "pointer",
              zIndex: clickedPlant?.id === plant.id ? 100 : 50,
            }}
            onClick={(e) => handlePlantMarkerClick(plant, e)}
          >
            <div
              className="marker-circle"
              style={{
                width: "16px",
                height: "16px",
                borderRadius: "50%",
                backgroundColor: color,
                border: "2px solid white",
                boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontSize: "9px",
                color: "white",
                fontWeight: "bold",
              }}
            >
              {plant.name.charAt(0)}
            </div>

            {/* Popup on marker click */}
            {clickedPlant?.id === plant.id && (
              <div
                className="plant-popup"
                style={{
                  position: "absolute",
                  top: "-120px",
                  left: "-80px",
                  width: "160px",
                  backgroundColor: "white",
                  border: "2px solid #2d5016",
                  borderRadius: "6px",
                  padding: "10px",
                  fontSize: "12px",
                  zIndex: 101,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                  pointerEvents: "none",
                }}
              >
                <strong>{plant.name}</strong>
                <br />
                {plant.type && <>{plant.type}</>}
                <br />
                Status: {getStatusDisplay(plant.status)}
                {plant.watering_volume_liters && (
                  <>
                    <br />
                    Volume: {plant.watering_volume_liters}L
                  </>
                )}
              </div>
            )}
          </div>
        );
      });
  };

  // New plant position marker on image
  const renderNewPlantMarker = () => {
    if (area?.photo_display_type !== "image" || !newPlantPosition) {
      return null;
    }

    return (
      <div
        className="new-plant-marker"
        style={{
          position: "absolute",
          left: `${newPlantPosition.x}px`,
          top: `${newPlantPosition.y}px`,
          transform: "translate(-50%, -50%)",
          zIndex: 75,
        }}
      >
        <div
          style={{
            width: "16px",
            height: "16px",
            borderRadius: "50%",
            backgroundColor: "#2d5016",
            border: "2px solid #ffeb3b",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
            opacity: 0.9,
          }}
        ></div>
      </div>
    );
  };

  useEffect(() => {
    // Always perform cleanup first to prevent old map instance from lingering
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.eachLayer((layer) => {
          mapInstanceRef.current.removeLayer(layer);
        });
        mapInstanceRef.current.remove();
      } catch (e) {
        console.error("Error removing map:", e);
      }
      mapInstanceRef.current = null;
    }

    if (mapRef.current) {
      mapRef.current.innerHTML = "";
      mapRef.current.hasMap = false;
    }
    plantsMarkersRef.current = [];
    clickMarkerRef.current = null;

    // Reset UI state when area changes
    setClickedPlant(null);
    setNewPlantPosition(null);
    setBoundaryError("");

    // Skip map initialization for image areas
    if (area?.photo_display_type === "image" && area?.photo_url) {
      return;
    }

    if (mapRef.current) {
      // Initialize map
      const initMap = () => {
        try {
          const L = window.L;
          if (!L) {
            console.error("Leaflet library not loaded");
            return;
          }

          // Ensure map container is clean
          if (!mapRef.current) {
            console.error("Map container not found");
            return;
          }

          const map = L.map(mapRef.current, { maxBounds: null }).setView(
            [31.7683, 35.2137],
            13,
          );
          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "© OpenStreetMap contributors",
            maxZoom: 19,
          }).addTo(map);

          // Parse area bounds if available and draw boundary
          if (area && area.bounds_json) {
            try {
              const bounds = JSON.parse(area.bounds_json);
              if (bounds && bounds.length === 2) {
                map.fitBounds(bounds);
                // Draw rectangle boundary
                if (area.type === "rectangle") {
                  L.rectangle(bounds, {
                    color: "#2d5016",
                    weight: 3,
                    opacity: 0.8,
                    fillOpacity: 0.15,
                  }).addTo(map);
                }
                // Draw polygon boundary
                else if (area.type === "polygon") {
                  L.polygon(bounds, {
                    color: "#2d5016",
                    weight: 3,
                    opacity: 0.8,
                    fillOpacity: 0.15,
                  }).addTo(map);
                }
              }
            } catch (e) {
              console.log("Could not parse bounds:", e);
            }
          }

          // Add plant markers
          plantsMarkersRef.current = [];
          if (plants && plants.length > 0) {
            plants.forEach((plant) => {
              if (plant.lat != null && plant.lng != null) {
                const color =
                  plant.status === "healthy"
                    ? "#4caf50"
                    : plant.status === "needs_water"
                      ? "#ff9800"
                      : plant.status === "diseased"
                        ? "#f44336"
                        : "#9e9e9e";

                const marker = L.circleMarker([plant.lat, plant.lng], {
                  radius: 8,
                  fillColor: color,
                  color: "#fff",
                  weight: 2,
                  opacity: 1,
                  fillOpacity: 0.8,
                })
                  .bindPopup(
                    `<strong>${plant.name}</strong><br/>${plant.type || ""}<br/>Status: ${getStatusDisplay(plant.status)}${plant.watering_volume_liters ? `<br/>Volume: ${plant.watering_volume_liters}L` : ""}`,
                  )
                  .addTo(map);
                plantsMarkersRef.current.push(marker);
              }
            });
          }

          // Add click handler to place plants
          map.on("click", (e) => {
            console.log("✓ Map clicked at:", e.latlng.lat, e.latlng.lng);
            const lat = e.latlng.lat;
            const lng = e.latlng.lng;

            // Remove previous click marker only
            if (clickMarkerRef.current) {
              console.log("Removing previous marker");
              map.removeLayer(clickMarkerRef.current);
            }

            // Add new marker at click location (stays on top)
            clickMarkerRef.current = L.circleMarker([lat, lng], {
              radius: 10,
              fillColor: "#2d5016",
              color: "#ffeb3b",
              weight: 3,
              opacity: 1,
              fillOpacity: 0.9,
            })
              .bindPopup(
                `<strong>New Plant Location</strong><br/>Lat: ${lat.toFixed(4)}<br/>Lng: ${lng.toFixed(4)}`,
              )
              .openPopup()
              .addTo(map);

            console.log("✓ Marker added at:", lat, lng);

            // Call parent callback with coordinates
            if (onMapClick) {
              console.log("Calling onMapClick with coordinates");
              onMapClick({ lat, lng });
            }
          });

          mapRef.current.hasMap = true;
          mapInstanceRef.current = map;
          console.log("✓ Map initialized for area:", area?.name);
        } catch (e) {
          console.error("Map initialization error:", e);
        }
      };

      // Check if Leaflet is loaded
      if (window.L) {
        initMap();
      } else {
        const timer = setTimeout(initMap, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [area, plants, onMapClick]);

  return (
    <div className="area-detail-map">
      {area?.photo_display_type === "image" && area?.photo_url ? (
        <div
          ref={imageContainerRef}
          className="area-image-container"
          onClick={handleImageClick}
          style={{
            position: "relative",
            cursor: "crosshair",
            userSelect: "none",
          }}
        >
          <img
            src={`${API_BASE_URL}${area.photo_url}`}
            alt={area.name}
            className="area-image"
          />

          {/* Render plant markers on image */}
          {renderPlantMarkers()}

          {/* Render temporary new plant marker */}
          {renderNewPlantMarker()}

          {/* Display boundary error if click is outside image */}
          {boundaryError && (
            <div
              style={{
                position: "absolute",
                top: "10px",
                left: "50%",
                transform: "translateX(-50%)",
                backgroundColor: "#f44336",
                color: "white",
                padding: "12px 20px",
                borderRadius: "4px",
                zIndex: 100,
                fontSize: "0.9em",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                maxWidth: "90%",
                textAlign: "center",
              }}
            >
              {boundaryError}
            </div>
          )}

          <div className="map-info">
            <p>
              <strong>Area:</strong> {area?.name}
            </p>
            <p>
              <strong>Plants:</strong> {plants?.length || 0} plants in this area
            </p>
            <p style={{ fontSize: "0.85em", marginTop: "10px", color: "#999" }}>
              💡 Click on the image to place a new plant
            </p>
          </div>
        </div>
      ) : (
        <>
          <div ref={mapRef} className="leaflet-map"></div>
          <div className="map-info">
            <p>
              <strong>Area Type:</strong> {area?.type}
            </p>
            <p>
              <strong>Plants:</strong> {plants?.length || 0} plants in this area
            </p>
            <p style={{ fontSize: "0.85em", marginTop: "10px", color: "#999" }}>
              💡 Click on the map to place a new plant inside this area
            </p>
          </div>
        </>
      )}
    </div>
  );
}
