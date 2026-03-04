const express = require("express");
const router = express.Router();
const db = require("./Database");
const { writeAudit } = require("./logs");

// GET /api/plants - Get all plants
router.get("/", (req, res) => {
  const areaId = req.query.areaId;
  let sql = `SELECT * FROM plants`;

  if (areaId) {
    sql += ` WHERE area_id = ?`;
  }

  sql += ` ORDER BY created_at DESC`;

  const params = areaId ? [areaId] : [];

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error("❌ Get plants error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    res.json({ plants: results });
  });
});

// GET /api/plants/:id - Get plant details
router.get("/:id", (req, res) => {
  const { id } = req.params;
  const sql = `SELECT * FROM plants WHERE id = ? LIMIT 1`;

  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("❌ Get plant error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "Plant not found" });
    }

    res.json({ plant: results[0] });
  });
});

// POST /api/plants - Create new plant
router.post("/", (req, res) => {
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
  const userId = req.headers["x-user-id"] || null;
  const actor = req.headers["x-user"] || "unknown";
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || null;

  if (!areaId || !name || !lat || !lng) {
    return res
      .status(400)
      .json({ error: "Area ID, name, and coordinates are required" });
  }

  const sql = `
        INSERT INTO plants (area_id, name, type, lat, lng, watering_frequency_days, status, soil_moisture, notes, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

  db.query(
    sql,
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
        plant: { id: result.insertId, areaId, name, type, lat, lng, status },
      });
    },
  );
});

// PUT /api/plants/:id - Update plant
router.put("/:id", (req, res) => {
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
  const actor = req.headers["x-user"] || "unknown";
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || null;

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
});

// DELETE /api/plants/:id - Delete plant
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  const actor = req.headers["x-user"] || "unknown";
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || null;

  const sql = `DELETE FROM plants WHERE id = ?`;

  db.query(sql, [id], async (err) => {
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
      });
    } catch (_) {}

    res.json({ message: "Plant deleted" });
  });
});

module.exports = router;
