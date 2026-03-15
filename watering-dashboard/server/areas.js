const express = require("express");
const router = express.Router();
const db = require("./Database");
const multer = require("multer");
const path = require("path");
const { writeAudit } = require("./logs");
const { ROLES, canManageAreas, canViewAllAreas } = require("./rbac");
const { requireAuth, requireRole } = require("./rbacMiddleware");

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

// GET /api/areas - Get areas based on user role
// Admin: sees all areas
// Area Manager & User: sees only assigned areas
router.get("/", requireAuth, (req, res) => {
  const userId = req.userId;
  const userRole = req.userRole;

  let sql;

  if (canViewAllAreas(userRole)) {
    // Admin sees all areas
    sql = `SELECT * FROM areas ORDER BY created_at DESC`;
    db.query(sql, (err, results) => {
      if (err) {
        console.error("❌ Get areas error:", err);
        return res.status(500).json({ error: "Database error" });
      }
      res.json({ areas: results });
    });
  } else {
    // Area Manager and User see only assigned areas
    sql = `SELECT DISTINCT a.* FROM areas a
           INNER JOIN user_area_mapping uam ON a.id = uam.area_id
           WHERE uam.user_id = ?
           ORDER BY a.created_at DESC`;

    db.query(sql, [userId], (err, results) => {
      if (err) {
        console.error("❌ Get areas error:", err);
        return res.status(500).json({ error: "Database error" });
      }
      res.json({ areas: results });
    });
  }
});

// GET /api/areas/:id - Get area details (check access)
router.get("/:id", requireAuth, (req, res) => {
  const { id } = req.params;
  const userId = req.userId;
  const userRole = req.userRole;

  let sql;
  let params;

  if (canViewAllAreas(userRole)) {
    // Admin sees all areas
    sql = `SELECT * FROM areas WHERE id = ? LIMIT 1`;
    params = [id];
  } else {
    // Area Manager and User must have access
    sql = `SELECT a.* FROM areas a
           INNER JOIN user_area_mapping uam ON a.id = uam.area_id
           WHERE a.id = ? AND uam.user_id = ?
           LIMIT 1`;
    params = [id, userId];
  }

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error("❌ Get area error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "Area not found or access denied" });
    }

    res.json({ area: results[0] });
  });
});

// POST /api/areas - Create new area
// Only Area Managers and Admins can create areas
router.post("/", requireRole(ROLES.AREA_MANAGER), (req, res) => {
  const { name, description, type, bounds_json, positions } = req.body;
  const userId = req.userId;
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
// Only Area Managers and Admins can update
// Area Managers can only update their own areas
router.put("/:id", requireAuth, (req, res) => {
  const { id } = req.params;
  const { name, description, type, bounds_json, positions } = req.body;
  const userId = req.userId;
  const userRole = req.userRole;
  const actor = req.headers["x-user"] || "unknown";
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || null;

  if (!canManageAreas(userRole)) {
    return res
      .status(403)
      .json({ error: "You do not have permission to update areas" });
  }

  // For area managers, verify they have access to this area
  let checkAccessSql;
  if (userRole !== ROLES.ADMIN) {
    checkAccessSql = `SELECT id FROM user_area_mapping WHERE user_id = ? AND area_id = ? LIMIT 1`;
    db.query(checkAccessSql, [userId, id], (checkErr, checkResults) => {
      if (checkErr || checkResults.length === 0) {
        return res
          .status(403)
          .json({ error: "You do not have access to this area" });
      }
      performUpdate();
    });
  } else {
    performUpdate();
  }

  function performUpdate() {
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
  }
});

// DELETE /api/areas/:id - Delete area
// Only Admins can delete areas
router.delete("/:id", requireRole(ROLES.ADMIN), (req, res) => {
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
// Only Area Managers and Admins with access can upload
router.post(
  "/:id/photo",
  requireAuth,
  upload.single("photo"),
  async (req, res) => {
    const { id } = req.params;
    const userId = req.userId;
    const userRole = req.userRole;
    const actor = req.headers["x-user"] || "unknown";
    const ip =
      req.headers["x-forwarded-for"] || req.socket.remoteAddress || null;

    if (!canManageAreas(userRole)) {
      return res
        .status(403)
        .json({ error: "You do not have permission to manage areas" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Check access for area managers
    if (userRole !== ROLES.ADMIN) {
      const checkAccessSql = `SELECT id FROM user_area_mapping WHERE user_id = ? AND area_id = ? LIMIT 1`;
      db.query(checkAccessSql, [userId, id], (checkErr, checkResults) => {
        if (checkErr || checkResults.length === 0) {
          return res
            .status(403)
            .json({ error: "You do not have access to this area" });
        }
        performUpload();
      });
    } else {
      performUpload();
    }

    function performUpload() {
      const photoUrl = `/uploads/areas/${req.file.filename}`;

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
    }
  },
);

module.exports = router;
