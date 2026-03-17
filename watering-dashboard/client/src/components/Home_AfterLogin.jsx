import React, { useState, useEffect, useCallback } from "react";
import "./Home_AfterLogin.css";
import AddAreaButton from "./AddAreaButton";
import EditAreaModal from "./EditAreaModal";
import AddPlantButton from "./AddPlantButton";
import EditPlantModal from "./EditPlantModal";
import AreaDetailMap from "./AreaDetailMap";
import AreaUsersModal from "./AreaUsersModal";
import { getStatusDisplay } from "../utils/statusMapping";
import {
  hasUpdatePermission,
  getPermissionDisplay,
} from "../utils/permissions";

export default function HomeAfterLogin({ user }) {
  const [areas, setAreas] = useState([]);
  const [plants, setPlants] = useState([]);
  const [selectedArea, setSelectedArea] = useState(null);
  const [showNewAreaModal, setShowNewAreaModal] = useState(false);
  const [showEditAreaModal, setShowEditAreaModal] = useState(false);
  const [editingArea, setEditingArea] = useState(null);
  const [showAddPlantModal, setShowAddPlantModal] = useState(false);
  const [showEditPlantModal, setShowEditPlantModal] = useState(false);
  const [editingPlant, setEditingPlant] = useState(null);
  const [showAreaUsersModal, setShowAreaUsersModal] = useState(false);
  const [managingArea, setManagingArea] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapCoordinates, setMapCoordinates] = useState(null);

  useEffect(() => {
    loadAreas();
  }, []);

  const loadAreas = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/areas", {
        headers: {
          "x-user-id": user.id,
          "x-user-role": user.role,
          "x-user": user.username,
        },
      });
      const data = await res.json();
      setAreas(data.areas || []);
      setLoading(false);
    } catch (err) {
      console.error("Error loading areas:", err);
      setLoading(false);
    }
  };

  const loadPlants = async (areaId) => {
    try {
      const res = await fetch(
        `http://localhost:3000/api/plants?areaId=${areaId}`,
        {
          headers: {
            "x-user-id": user.id,
            "x-user-role": user.role,
            "x-user": user.username,
          },
        },
      );
      const data = await res.json();
      setPlants(data.plants || []);
    } catch (err) {
      console.error("Error loading plants:", err);
    }
  };

  const handleSelectArea = (area) => {
    setSelectedArea(area);
    loadPlants(area.id);
  };

  const handleNewArea = async () => {
    await loadAreas();
    setShowNewAreaModal(false);
  };

  const handleEditArea = (area) => {
    setEditingArea(area);
    setShowEditAreaModal(true);
  };

  const handleUpdateArea = async () => {
    await loadAreas();
    setShowEditAreaModal(false);
    if (selectedArea) {
      handleSelectArea(selectedArea);
    }
  };

  const handleDeleteArea = async (areaId) => {
    if (
      window.confirm(
        "Are you sure you want to delete this area and all its plants?",
      )
    ) {
      try {
        const res = await fetch(`http://localhost:3000/api/areas/${areaId}`, {
          method: "DELETE",
          headers: {
            "x-user-id": user.id,
            "x-user-role": user.role,
            "x-user": user.username,
          },
        });
        if (res.ok) {
          await loadAreas();
          if (selectedArea?.id === areaId) {
            setSelectedArea(null);
            setPlants([]);
          }
        }
      } catch (err) {
        console.error("Error deleting area:", err);
      }
    }
  };

  const handleManageAreaUsers = (area) => {
    setManagingArea(area);
    setShowAreaUsersModal(true);
  };

  const handleAddPlant = async () => {
    loadPlants(selectedArea.id);
    setShowAddPlantModal(false);
  };

  const handleEditPlant = (plant) => {
    setEditingPlant(plant);
    setShowEditPlantModal(true);
  };

  const handleUpdatePlant = async () => {
    if (selectedArea) {
      loadPlants(selectedArea.id);
    }
    setShowEditPlantModal(false);
  };

  const handleDeletePlant = async (plantId) => {
    if (window.confirm("Are you sure you want to delete this plant?")) {
      try {
        const res = await fetch(`http://localhost:3000/api/plants/${plantId}`, {
          method: "DELETE",
          headers: {
            "x-user-id": user.id,
            "x-user-role": user.role,
            "x-user": user.username,
          },
        });
        if (res.ok && selectedArea) {
          loadPlants(selectedArea.id);
        }
      } catch (err) {
        console.error("Error deleting plant:", err);
      }
    }
  };

  const handleMapClick = useCallback(({ lat, lng }) => {
    setMapCoordinates({ lat, lng });
  }, []);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div className="home-after-login">
      <div className="dashboard-container">
        <div className="sidebar">
          <div className="sidebar-header">
            <h2>🌍 Areas</h2>
            <AddAreaButton onAreaCreated={handleNewArea} user={user} />
          </div>

          <div className="areas-list">
            {areas.length === 0 ? (
              <div className="no-areas">
                <i className="fas fa-inbox"></i>
                <p>No areas yet</p>
              </div>
            ) : (
              areas.map((area) => (
                <div
                  key={area.id}
                  className={`area-item ${selectedArea?.id === area.id ? "active" : ""}`}
                  onClick={() => handleSelectArea(area)}
                >
                  <div className="area-info">
                    <h4>{area.name}</h4>
                    <p className="area-desc">
                      {area.description || "No description"}
                    </p>
                    <div className="area-meta-row">
                      <span className="area-meta">{area.type}</span>
                      <span
                        className={`area-permission permission-${user.role === "admin" ? "area_manager" : area.permission}`}
                      >
                        {getPermissionDisplay(
                          user.role === "admin"
                            ? "area_manager"
                            : area.permission,
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="area-actions">
                    {user.role === "admin" && (
                      <button
                        className="btn-icon btn-danger"
                        title="Delete area"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteArea(area.id);
                        }}
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="main-content">
          {selectedArea ? (
            <>
              <div className="area-header">
                <h2>{selectedArea.name}</h2>
                <div className="area-header-actions">
                  {(user.role === "admin" ||
                    selectedArea.permission === "area_manager") && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleManageAreaUsers(selectedArea)}
                      title="Manage users for this area"
                    >
                      <i className="fas fa-users"></i> Manage Users
                    </button>
                  )}
                  {hasUpdatePermission(selectedArea.permission) && (
                    <AddPlantButton
                      areaId={selectedArea.id}
                      area={selectedArea}
                      onPlantCreated={handleAddPlant}
                      user={user}
                      mapCoordinates={mapCoordinates}
                      onMapCoordinatesUsed={() => setMapCoordinates(null)}
                    />
                  )}
                </div>
              </div>

              <div className="area-content-wrapper">
                <div className="plants-section">
                  <h3>🌱 Plants in this Area ({plants.length})</h3>
                  {plants.length === 0 ? (
                    <div className="no-plants">
                      <i className="fas fa-spa"></i>
                      <p>No plants in this area</p>
                    </div>
                  ) : (
                    <div className="plants-grid">
                      {plants.map((plant) => (
                        <div
                          key={plant.id}
                          className={`plant-card status-${plant.status}`}
                        >
                          <div className="plant-header">
                            <h4>{plant.name}</h4>
                            <span className={`status-badge ${plant.status}`}>
                              {getStatusDisplay(plant.status)}
                            </span>
                          </div>
                          <div className="plant-info">
                            <p>
                              <strong>Type:</strong> {plant.type || "Unknown"}
                            </p>
                            <p>
                              <strong>Watering:</strong> Every{" "}
                              {plant.watering_frequency_days} days
                            </p>
                            {plant.last_watered && (
                              <p>
                                <strong>Last Watered:</strong>{" "}
                                {new Date(
                                  plant.last_watered,
                                ).toLocaleDateString()}
                              </p>
                            )}
                            {plant.soil_moisture !== null && (
                              <p>
                                <strong>Soil Moisture:</strong>{" "}
                                {plant.soil_moisture}%
                              </p>
                            )}
                            {plant.notes && (
                              <p>
                                <strong>Notes:</strong> {plant.notes}
                              </p>
                            )}
                          </div>
                          <div className="plant-actions">
                            {hasUpdatePermission(selectedArea.permission) ? (
                              <>
                                <button
                                  className="btn btn-sm btn-info"
                                  onClick={() => handleEditPlant(plant)}
                                >
                                  <i className="fas fa-edit"></i> Edit
                                </button>
                                <button
                                  className="btn btn-sm btn-danger"
                                  onClick={() => handleDeletePlant(plant.id)}
                                >
                                  <i className="fas fa-trash"></i> Delete
                                </button>
                              </>
                            ) : (
                              <button
                                className="btn btn-sm btn-secondary"
                                disabled
                                title="Read-only access"
                              >
                                <i className="fas fa-lock"></i> Read Only
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="map-container">
                  <AreaDetailMap
                    area={selectedArea}
                    plants={plants}
                    user={user}
                    onMapClick={handleMapClick}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <i className="fas fa-map-location-dot"></i>
              <h2>Select an Area</h2>
              <p>Choose an area from the left to view and manage its plants</p>
            </div>
          )}
        </div>
      </div>

      {showEditAreaModal && (
        <EditAreaModal
          area={editingArea}
          onClose={() => setShowEditAreaModal(false)}
          onUpdate={handleUpdateArea}
          user={user}
        />
      )}

      {showEditPlantModal && (
        <EditPlantModal
          plant={editingPlant}
          onClose={() => setShowEditPlantModal(false)}
          onUpdate={handleUpdatePlant}
          user={user}
        />
      )}

      {showAreaUsersModal && managingArea && (
        <AreaUsersModal
          area={managingArea}
          onClose={() => {
            setShowAreaUsersModal(false);
            setManagingArea(null);
          }}
          user={user}
        />
      )}
    </div>
  );
}
