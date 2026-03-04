import React, { useRef, useEffect } from "react";
import "./AreaDetailMap.css";

export default function AreaDetailMap({ area, plants, user, onMapClick }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const clickMarkerRef = useRef(null);

  useEffect(() => {
    if (mapRef.current && !mapRef.current.hasMap) {
      // Initialize map
      const initMap = () => {
        try {
          const L = window.L;
          if (!L) {
            console.error("Leaflet library not loaded");
            return;
          }

          // Clear any existing map instance
          if (mapRef.current._leaflet_id) {
            return;
          }

          const map = L.map(mapRef.current).setView([31.7683, 35.2137], 13);
          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "© OpenStreetMap contributors",
            maxZoom: 19,
          }).addTo(map);

          // Parse area bounds if available
          if (area && area.bounds_json) {
            try {
              const bounds = JSON.parse(area.bounds_json);
              if (bounds && bounds.length === 2) {
                map.fitBounds(bounds);
                // Draw rectangle if rectangle type
                if (area.type === "rectangle") {
                  const rect = L.rectangle(bounds, {
                    color: "#2d5016",
                    weight: 2,
                    opacity: 0.6,
                    fillOpacity: 0.1,
                  }).addTo(map);
                }
              }
            } catch (e) {
              console.log("Could not parse bounds:", e);
            }
          }

          // Add plant markers
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

                L.circleMarker([plant.lat, plant.lng], {
                  radius: 8,
                  fillColor: color,
                  color: "#fff",
                  weight: 2,
                  opacity: 1,
                  fillOpacity: 0.8,
                })
                  .bindPopup(
                    `<strong>${plant.name}</strong><br/>${plant.type || ""}<br/>Status: ${plant.status}`,
                  )
                  .addTo(map);
              }
            });
          }

          // Add click handler to place plants
          map.on("click", (e) => {
            const lat = e.latlng.lat;
            const lng = e.latlng.lng;

            // Remove previous click marker
            if (clickMarkerRef.current) {
              map.removeLayer(clickMarkerRef.current);
            }

            // Add new marker at click location
            clickMarkerRef.current = L.circleMarker([lat, lng], {
              radius: 10,
              fillColor: "#2d5016",
              color: "#fff",
              weight: 3,
              opacity: 1,
              fillOpacity: 0.9,
            })
              .bindPopup(
                `Click placement: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
              )
              .openPopup()
              .addTo(map);

            // Call parent callback with coordinates
            if (onMapClick) {
              onMapClick({ lat, lng });
            }
          });

          mapRef.current.hasMap = true;
          mapInstanceRef.current = map;
          console.log("✓ Map initialized successfully");
        } catch (e) {
          console.error("Map initialization error:", e);
        }
      };

      // Check if Leaflet is loaded, if not wait a bit
      if (window.L) {
        initMap();
      } else {
        // Give Leaflet scripts time to load
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
          <strong>Area Type:</strong> {area.type}
        </p>
        <p>
          <strong>Plants:</strong> {plants.length} plants in this area
        </p>
        <p style={{ fontSize: "0.85em", marginTop: "10px", color: "#999" }}>
          💡 Click on the map to place a new plant
        </p>
      </div>
    </div>
  );
}
