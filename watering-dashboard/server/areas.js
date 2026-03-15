const express = require("express");
const router = express.Router();
const db = require("./Database");
const multer = require("multer");
const path = require("path");
const { writeAudit } = require("./logs");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "uploads", "areas"));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// GET /api/areas - Get all areas
router.get("/", (req, res) => {
  const sql = `SELECT * FROM areas ORDER BY created_at DESC`;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("❌ Get areas error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    res.json({ areas: results });
  });
});

// GET /api/areas/:id - Get area details
router.get("/:id", (req, res) => {
  const { id } = req.params;
  const sql = `SELECT * FROM areas WHERE id = ? LIMIT 1`;

  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("❌ Get area error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "Area not found" });
    }

    res.json({ area: results[0] });
  });
});

// POST /api/areas - Create new area
router.post("/", (req, res) => {
  const { name, description, type, bounds_json, positions } = req.body;
  const userId = req.headers["x-user-id"] || null;
  const actor = req.headers["x-user"] || "unknown";
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || null;

  if (!name || !type) {
    return res.status(400).json({ error: "Name and type are required" });
  }

  const sql = `
        INSERT INTO areas (name, description, type, bounds_json, positions, created_by)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

  db.query(
    sql,
    [
      name,
      description || null,
      type,
      bounds_json ? JSON.stringify(bounds_json) : null,
      positions ? JSON.stringify(positions) : null,
      userId,
    ],
    async (err, result) => {
      if (err) {
        console.error("❌ Create area error:", err);
        return res.status(500).json({ error: "Database error" });
      }

      try {
        await writeAudit({
          action: "area_create",
          entity_type: "area",
          entity_id: result.insertId,
          actor,
          ip,
          details: { name, type },
        });
      } catch (_) {}

      res.status(201).json({
        message: "Area created",
        areaId: result.insertId,
        area: { id: result.insertId, name, description, type },
      });
    },
  );
});

// PUT /api/areas/:id - Update area
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { name, description, type, bounds_json, positions } = req.body;
  const actor = req.headers["x-user"] || "unknown";
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || null;

  const sql = `
        UPDATE areas 
        SET name = ?, description = ?, type = ?, bounds_json = ?, positions = ?
        WHERE id = ?
    `;

  db.query(
    sql,
    [
      name,
      description || null,
      type,
      bounds_json ? JSON.stringify(bounds_json) : null,
      positions ? JSON.stringify(positions) : null,
      id,
    ],
    async (err) => {
      if (err) {
        console.error("❌ Update area error:", err);
        return res.status(500).json({ error: "Database error" });
      }

      try {
        await writeAudit({
          action: "area_update",
          entity_type: "area",
          entity_id: id,
          actor,
          ip,
          details: { name },
        });
      } catch (_) {}

      res.json({ message: "Area updated" });
    },
  );
});

// DELETE /api/areas/:id - Delete area
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  const actor = req.headers["x-user"] || "unknown";
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || null;

  // First, get the area details before deleting
  const getAreaSql = `SELECT name FROM areas WHERE id = ? LIMIT 1`;
  db.query(getAreaSql, [id], (err, results) => {
    if (err) {
      console.error("❌ Get area details error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    const areaName = results.length > 0 ? results[0].name : "Unknown Area";

    const deleteSql = `DELETE FROM areas WHERE id = ?`;

    db.query(deleteSql, [id], async (err) => {
      if (err) {
        console.error("❌ Delete area error:", err);
        return res.status(500).json({ error: "Database error" });
      }

      try {
        await writeAudit({
          action: "area_delete",
          entity_type: "area",
          entity_id: id,
          actor,
          ip,
          details: { name: areaName },
        });
      } catch (_) {}

      res.json({ message: "Area deleted" });
    });
  });
});

// POST /api/areas/:id/photo - Upload area photo
router.post("/:id/photo", upload.single("photo"), async (req, res) => {
  const { id } = req.params;

  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const photoUrl = `/uploads/areas/${req.file.filename}`;
  const actor = req.headers["x-user"] || "unknown";
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || null;

  const sql = `UPDATE areas SET photo_url = ? WHERE id = ?`;

  db.query(sql, [photoUrl, id], async (err) => {
    if (err) {
      console.error("❌ Update area photo error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    try {
      await writeAudit({
        action: "area_photo_upload",
        entity_type: "area",
        entity_id: id,
        actor,
        ip,
        details: { filename: req.file.filename },
      });
    } catch (_) {}

    res.json({ message: "Photo uploaded", photoUrl });
  });
});

module.exports = router;
