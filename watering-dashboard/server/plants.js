const express = require("express");
const router = express.Router();
const db = require("./Database");
const { writeAudit } = require("./logs");
const { ROLES, canManageAreas, canViewAllAreas } = require("./rbac");
const { requireAuth, requireRole } = require("./rbacMiddleware");

// Helper functions for geometry
function parseJSON(str) {
  try {
    return str ? JSON.parse(str) : null;
  } catch {
    return null;
  }
}

function pointInRect([lat, lng], bounds) {
  if (!Array.isArray(bounds) || bounds.length !== 2) return false;
  const [south, west] = bounds[0];
  const [north, east] = bounds[1];
  const s = Math.min(south, north);
  const n = Math.max(south, north);
  const w = Math.min(west, east);
  const e = Math.max(west, east);
  return lat >= s && lat <= n && lng >= w && lng <= e;
}

function pointInPolygon([lat, lng], positions) {
  if (!Array.isArray(positions) || positions.length < 3) return false;
  let inside = false;
  for (let i = 0, j = positions.length - 1; i < positions.length; j = i++) {
    const [lat1, lng1] = positions[i];
    const [lat2, lng2] = positions[j];
    const intersect =
      lat1 > lng !== lat2 > lng &&
      lng < ((lng2 - lng1) * (lat - lat1)) / (lat2 - lat1 || 1e-12) + lng1;
    if (intersect) inside = !inside;
  }
  return inside;
}

// GET /api/plants - Get plants based on user role and assigned areas
router.get("/", requireAuth, (req, res) => {
  const areaId = req.query.areaId;
  const userId = req.userId;
  const userRole = req.userRole;

  let sql = `SELECT p.* FROM plants p`;
  let params = [];

  if (canViewAllAreas(userRole)) {
    // Admin sees all plants
    if (areaId) {
      sql += ` WHERE p.area_id = ?`;
      params = [areaId];
    }
  } else {
    // Area Manager and User see only plants in their assigned areas
    sql += ` INNER JOIN user_area_mapping uam ON p.area_id = uam.area_id
             WHERE uam.user_id = ?`;
    params = [userId];

    if (areaId) {
      sql += ` AND p.area_id = ?`;
      params.push(areaId);
    }
  }

  sql += ` ORDER BY p.created_at DESC`;

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error("❌ Get plants error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    res.json({ plants: results });
  });
});

// GET /api/plants/:id - Get plant details (check access to plant's area)
router.get("/:id", requireAuth, (req, res) => {
  const { id } = req.params;
  const userId = req.userId;
  const userRole = req.userRole;

  let sql = `SELECT p.* FROM plants p`;
  let params;

  if (canViewAllAreas(userRole)) {
    // Admin sees all plants
    sql += ` WHERE p.id = ? LIMIT 1`;
    params = [id];
  } else {
    // Area Manager and User must have access to the area
    sql += ` INNER JOIN user_area_mapping uam ON p.area_id = uam.area_id
             WHERE p.id = ? AND uam.user_id = ? LIMIT 1`;
    params = [id, userId];
  }

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error("❌ Get plant error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (results.length === 0) {
      return res
        .status(404)
        .json({ error: "Plant not found or access denied" });
    }

    res.json({ plant: results[0] });
  });
});

// POST /api/plants - Create new plant
// Only Area Managers and Admins can create plants in their areas
router.post("/", requireAuth, (req, res) => {
  const {
    areaId,
    name,
    type,
    lat,
    lng,
    wateringFrequencyDays,
    status,
    soilMoisture,
    notes,
  } = req.body;
  const userId = req.userId;
  const userRole = req.userRole;
  const actor = req.headers["x-user"] || "unknown";
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || null;

  if (!canManageAreas(userRole)) {
    return res
      .status(403)
      .json({ error: "You do not have permission to create plants" });
  }

  if (!areaId || !name || lat == null || lng == null) {
    return res
      .status(400)
      .json({ error: "Area ID, name, and coordinates are required" });
  }

  // Check area access for area managers
  let checkAccessSql;
  let checkAccessParams;

  if (userRole !== ROLES.ADMIN) {
    checkAccessSql = `SELECT id FROM user_area_mapping WHERE user_id = ? AND area_id = ? LIMIT 1`;
    checkAccessParams = [userId, areaId];
  } else {
    checkAccessSql = `SELECT id FROM areas WHERE id = ? LIMIT 1`;
    checkAccessParams = [areaId];
  }

  db.query(checkAccessSql, checkAccessParams, (accessErr, accessResults) => {
    if (accessErr || accessResults.length === 0) {
      return res
        .status(403)
        .json({ error: "You do not have access to this area" });
    }

    // First, get the area to validate coordinates are within bounds
    const areaSql = `SELECT type, bounds_json, positions FROM areas WHERE id = ? LIMIT 1`;
    db.query(areaSql, [areaId], (err, areaResults) => {
      if (err) {
        console.error("❌ Error fetching area:", err);
        return res.status(500).json({ error: "Database error" });
      }

      if (!areaResults || areaResults.length === 0) {
        return res.status(404).json({ error: "Area not found" });
      }

      const area = areaResults[0];
      let isWithinBounds = true;

      // Validate coordinates are within area bounds
      if (area.bounds_json) {
        try {
          const bounds = parseJSON(area.bounds_json);
          if (area.type === "rectangle") {
            isWithinBounds = pointInRect([lat, lng], bounds);
          } else if (area.type === "polygon") {
            const positions = parseJSON(area.positions);
            if (positions) {
              isWithinBounds = pointInPolygon([lat, lng], positions);
            }
          }
        } catch (e) {
          console.log("Could not validate bounds:", e);
        }
      }

      if (!isWithinBounds) {
        return res.status(400).json({
          error:
            "Plant location must be within the area boundary. Please click on the map inside the area.",
        });
      }

      // Insert plant if validation passed
      const plantSql = `
        INSERT INTO plants (area_id, name, type, lat, lng, watering_frequency_days, status, soil_moisture, notes, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.query(
        plantSql,
        [
          areaId,
          name,
          type || null,
          lat,
          lng,
          wateringFrequencyDays || 1,
          status || "healthy",
          soilMoisture || null,
          notes || null,
          userId,
        ],
        async (err, result) => {
          if (err) {
            console.error("❌ Create plant error:", err);
            return res.status(500).json({ error: "Database error" });
          }

          try {
            await writeAudit({
              action: "plant_create",
              entity_type: "plant",
              entity_id: result.insertId,
              actor,
              ip,
              details: { name, areaId },
            });
          } catch (_) {}

          res.status(201).json({
            message: "Plant created",
            plantId: result.insertId,
            plant: {
              id: result.insertId,
              areaId,
              name,
              type,
              lat,
              lng,
              status,
            },
          });
        },
      );
    });
  });
});

// PUT /api/plants/:id - Update plant
// Only Area Managers and Admins with access can update
router.put("/:id", requireAuth, (req, res) => {
  const { id } = req.params;
  const {
    name,
    type,
    lat,
    lng,
    wateringFrequencyDays,
    status,
    soilMoisture,
    notes,
    lastWatered,
  } = req.body;
  const userId = req.userId;
  const userRole = req.userRole;
  const actor = req.headers["x-user"] || "unknown";
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || null;

  if (!canManageAreas(userRole)) {
    return res
      .status(403)
      .json({ error: "You do not have permission to update plants" });
  }

  // First get the plant to check area access
  const getPlantSql = `SELECT area_id FROM plants WHERE id = ? LIMIT 1`;
  db.query(getPlantSql, [id], (err, plantResults) => {
    if (err) {
      console.error("❌ Get plant error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (!plantResults || plantResults.length === 0) {
      return res.status(404).json({ error: "Plant not found" });
    }

    const areaId = plantResults[0].area_id;

    // Check area access for area managers
    if (userRole !== ROLES.ADMIN) {
      const checkAccessSql = `SELECT id FROM user_area_mapping WHERE user_id = ? AND area_id = ? LIMIT 1`;
      db.query(checkAccessSql, [userId, areaId], (accessErr, accessResults) => {
        if (accessErr || accessResults.length === 0) {
          return res
            .status(403)
            .json({ error: "You do not have access to this plant" });
        }
        performUpdate();
      });
    } else {
      performUpdate();
    }

    function performUpdate() {
      const sql = `
        UPDATE plants 
        SET name = ?, type = ?, lat = ?, lng = ?, watering_frequency_days = ?, 
            status = ?, soil_moisture = ?, notes = ?, last_watered = ?
        WHERE id = ?
      `;

      db.query(
        sql,
        [
          name,
          type || null,
          lat,
          lng,
          wateringFrequencyDays || 1,
          status || "healthy",
          soilMoisture || null,
          notes || null,
          lastWatered || null,
          id,
        ],
        async (err) => {
          if (err) {
            console.error("❌ Update plant error:", err);
            return res.status(500).json({ error: "Database error" });
          }

          try {
            await writeAudit({
              action: "plant_update",
              entity_type: "plant",
              entity_id: id,
              actor,
              ip,
              details: { name, status },
            });
          } catch (_) {}

          res.json({ message: "Plant updated" });
        },
      );
    }
  });
});

// DELETE /api/plants/:id - Delete plant
// Only Admins can delete plants
router.delete("/:id", requireRole(ROLES.ADMIN), (req, res) => {
  const { id } = req.params;
  const actor = req.headers["x-user"] || "unknown";
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || null;

  // First, get the plant details before deleting
  const getPlantSql = `SELECT name FROM plants WHERE id = ? LIMIT 1`;
  db.query(getPlantSql, [id], (err, results) => {
    if (err) {
      console.error("❌ Get plant details error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    const plantName = results.length > 0 ? results[0].name : "Unknown Plant";

    const deleteSql = `DELETE FROM plants WHERE id = ?`;

    db.query(deleteSql, [id], async (err) => {
      if (err) {
        console.error("❌ Delete plant error:", err);
        return res.status(500).json({ error: "Database error" });
      }

      try {
        await writeAudit({
          action: "plant_delete",
          entity_type: "plant",
          entity_id: id,
          actor,
          ip,
          details: { name: plantName },
        });
      } catch (_) {}

      res.json({ message: "Plant deleted" });
    });
  });
});

module.exports = router;
