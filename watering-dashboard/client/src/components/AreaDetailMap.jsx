import React, { useRef, useEffect } from "react";
import "./AreaDetailMap.css";
import { getStatusDisplay } from "../utils/statusMapping";

export default function AreaDetailMap({ area, plants, user, onMapClick }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const clickMarkerRef = useRef(null);
  const plantsMarkersRef = useRef([]);

  useEffect(() => {
    // Destroy existing map when area changes
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
                    `<strong>${plant.name}</strong><br/>${plant.type || ""}<br/>Status: ${getStatusDisplay(plant.status)}`,
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
    </div>
  );
}
