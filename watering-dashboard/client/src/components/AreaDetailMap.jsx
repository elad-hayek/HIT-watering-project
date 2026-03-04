import React, { useRef, useEffect } from "react";
import "./AreaDetailMap.css";

export default function AreaDetailMap({ area, plants, user }) {
  const mapRef = useRef(null);

  useEffect(() => {
    if (mapRef.current && !mapRef.current.hasMap) {
      // Initialize map
      try {
        const L = window.L;
        if (L) {
          const map = L.map(mapRef.current).setView([31.7683, 35.2137], 13);
          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "© OpenStreetMap contributors",
            maxZoom: 19,
          }).addTo(map);

          // Parse area bounds if available
          if (area.bounds_json) {
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
              console.log("Could not parse bounds");
            }
          }

          // Add plant markers
          plants.forEach((plant) => {
            if (plant.lat && plant.lng) {
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
                  `<strong>${plant.name}</strong><br/>${plant.type}<br/>Status: ${plant.status}`,
                )
                .addTo(map);
            }
          });

          mapRef.current.hasMap = true;
          mapRef.current._leaflet_map = map;
        }
      } catch (e) {
        console.error("Map initialization error:", e);
      }
    }
  }, [area, plants]);

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
      </div>
    </div>
  );
}
