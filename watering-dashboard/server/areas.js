const express = require("express");
const router = express.Router();
const db = require("./Database");
const multer = require("multer");
const path = require("path");
const { writeAudit } = require("./logs");
const {
  ROLES,
  canManageAreas,
  canViewAllAreas,
  hasAreaUpdatePermission,
} = require("./rbac");
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
// Admin: sees all areas (with 'update' permission)
// Area Manager & User: sees only assigned areas (with their assigned permission)
router.get("/", requireAuth, (req, res) => {
  const userId = req.userId;
  const userRole = req.userRole;

  let sql;

  if (canViewAllAreas(userRole)) {
    // Admin sees all areas
    sql = `SELECT *, 'update' as permission FROM areas ORDER BY created_at DESC`;
    db.query(sql, (err, results) => {
      if (err) {
        console.error("❌ Get areas error:", err);
        return res.status(500).json({ error: "Database error" });
      }
      res.json({ areas: results });
    });
  } else {
    // Area Manager and User see only assigned areas with their permissions
    sql = `SELECT DISTINCT a.*, uam.permission FROM areas a
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
    // Admin sees all areas, always has update permission
    sql = `SELECT *, 'update' as permission FROM areas WHERE id = ? LIMIT 1`;
    params = [id];
  } else {
    // Area Manager and User must have access and get their permission
    sql = `SELECT a.*, uam.permission FROM areas a
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
// Any authenticated user can create areas (will become area manager for that area)
router.post("/", requireAuth, (req, res) => {
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

      const areaId = result.insertId;

      // Auto-assign creator as area manager with update permission
      const mappingSql = `
        INSERT INTO user_area_mapping (user_id, area_id, permission, assigned_by)
        VALUES (?, ?, 'update', ?)
      `;

      db.query(mappingSql, [userId, areaId, userId], async (err2) => {
        if (err2) {
          console.error("❌ Create area mapping error:", err2);
          return res.status(500).json({ error: "Database error" });
        }

        try {
          await writeAudit({
            action: "area_create",
            entity_type: "area",
            entity_id: areaId,
            actor,
            ip,
            details: { name, type },
          });
        } catch (_) {}

        res.status(201).json({
          message: "Area created",
          areaId: areaId,
          area: { id: areaId, name, description, type },
        });
      });
    },
  );
});

// PUT /api/areas/:id - Update area
// Area Members with 'update' permission and Admins can update
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

  // For area managers and users, verify they have update permission
  let checkAccessSql;
  if (userRole !== ROLES.ADMIN) {
    checkAccessSql = `SELECT permission FROM user_area_mapping WHERE user_id = ? AND area_id = ? LIMIT 1`;
    db.query(checkAccessSql, [userId, id], (checkErr, checkResults) => {
      if (checkErr || checkResults.length === 0) {
        return res
          .status(403)
          .json({ error: "You do not have access to this area" });
      }
      // Check if permission is 'update'
      if (!hasAreaUpdatePermission(userRole, checkResults[0].permission)) {
        return res.status(403).json({
          error:
            "You do not have permission to update this area. Your access is read-only.",
        });
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
// Only Area Managers and Admins can delete areas
// Users with just 'update' permission cannot delete
router.delete("/:id", requireAuth, (req, res) => {
  const { id } = req.params;
  const userId = req.userId;
  const userRole = req.userRole;
  const actor = req.headers["x-user"] || "unknown";
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || null;

  // Only admins can delete
  if (userRole === ROLES.ADMIN) {
    // Admin can delete any area
    performDelete();
  } else {
    return res.status(403).json({
      error: "You do not have permission to delete areas",
    });
  }

  function performDelete() {
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
  }
});

// POST /api/areas/:id/photo - Upload area photo
// Area Members with 'update' permission and Admins can upload
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

    // Check access and permission for area managers and users
    if (userRole !== ROLES.ADMIN) {
      const checkAccessSql = `SELECT permission FROM user_area_mapping WHERE user_id = ? AND area_id = ? LIMIT 1`;
      db.query(checkAccessSql, [userId, id], (checkErr, checkResults) => {
        if (checkErr || checkResults.length === 0) {
          return res
            .status(403)
            .json({ error: "You do not have access to this area" });
        }
        // Check if permission is 'update'
        if (!hasAreaUpdatePermission(userRole, checkResults[0].permission)) {
          return res.status(403).json({
            error:
              "You do not have permission to update this area. Your access is read-only.",
          });
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

// GET /api/areas/:id/users - Get all users assigned to an area
// Only admins can view this
router.get("/:id/users", requireAuth, (req, res) => {
  const { id } = req.params;
  const userId = req.userId;
  const userRole = req.userRole;
  const actor = req.headers["x-user"] || "unknown";
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || null;

  // Only admins can view and manage area users
  if (userRole !== ROLES.ADMIN) {
    return res.status(403).json({
      error: "You do not have permission to manage this area",
    });
  }

  // Verify the area exists
  const checkAccessSql = `SELECT 1 FROM areas WHERE id = ? LIMIT 1`;

  db.query(checkAccessSql, [id], (err, checkResults) => {
    if (err || checkResults.length === 0) {
      return res.status(403).json({
        error: "You do not have permission to manage this area",
      });
    }

    // Get all users assigned to this area
    const sql = `
      SELECT u.id, u.username, u.name, u.lastname, u.role, 
             uam.permission, uam.assigned_at, uam.assigned_by,
             a.created_by,
             CASE 
               WHEN u.id = a.created_by THEN true
               WHEN u.role = 'admin' THEN true
               ELSE false
             END as isFixedRole
      FROM user_area_mapping uam
      INNER JOIN users u ON uam.user_id = u.id
      INNER JOIN areas a ON uam.area_id = a.id
      WHERE uam.area_id = ?
      ORDER BY uam.assigned_at DESC
    `;

    db.query(sql, [id], async (err2, results) => {
      if (err2) {
        console.error("❌ Get area users error:", err2);
        return res.status(500).json({ error: "Database error" });
      }

      // For creator and admins, force permission to 'update'
      results = results.map((u) => ({
        ...u,
        permission: u.isFixedRole ? "update" : u.permission,
      }));

      try {
        await writeAudit({
          action: "area_users_viewed",
          entity_type: "area",
          entity_id: id,
          actor,
          ip,
        });
      } catch (_) {}

      res.json({ users: results });
    });
  });
});

// PUT /api/areas/:id/users/:userId - Update user permission for an area
// Only area managers and admins can do this
router.put("/:id/users/:userId", requireAuth, (req, res) => {
  const { id: areaId, userId } = req.params;
  const { permission } = req.body;
  const managerId = req.userId;
  const managerRole = req.userRole;
  const actor = req.headers["x-user"] || "unknown";
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || null;

  // Only global admins can manage area permissions
  if (managerRole !== ROLES.ADMIN) {
    return res.status(403).json({
      error: "Only admins can manage area permissions",
    });
  }

  // Validate permission - must be 'read' or 'update'
  const validPermissions = ["read", "update"];
  if (!validPermissions.includes(permission)) {
    return res.status(400).json({
      error: "Invalid permission. Must be 'read' or 'update'",
    });
  }

  // Verify the area exists
  const checkAreaSql = `SELECT id FROM areas WHERE id = ? LIMIT 1`;
  db.query(checkAreaSql, [areaId], (err, areaResults) => {
    if (err || areaResults.length === 0) {
      return res.status(404).json({
        error: "Area not found",
      });
    }

    // Check if user being modified is the area creator or an admin
    const checkFixedRoleSql = `
      SELECT u.role, a.created_by
      FROM users u
      INNER JOIN areas a ON a.id = ?
      WHERE u.id = ?
      LIMIT 1
    `;

    db.query(checkFixedRoleSql, [areaId, userId], (err3, fixedRoleResults) => {
      if (err3 || fixedRoleResults.length === 0) {
        return res.status(500).json({ error: "Database error" });
      }

      const userRole = fixedRoleResults[0].role;
      const isCreator = fixedRoleResults[0].created_by === parseInt(userId);
      const isAdmin = userRole === ROLES.ADMIN;

      // Prevent changing permission for area creator or admins
      if (isCreator || isAdmin) {
        return res.status(403).json({
          error:
            "Cannot change permission for area creator or admin users. They always have editor permission.",
        });
      }

      // Update the permission
      const updateSql = `
        UPDATE user_area_mapping 
        SET permission = ?
        WHERE user_id = ? AND area_id = ?
        LIMIT 1
      `;

      db.query(updateSql, [permission, userId, areaId], async (err2) => {
        if (err2) {
          console.error("❌ Update user permission error:", err2);
          return res.status(500).json({ error: "Database error" });
        }

        try {
          await writeAudit({
            action: "area_user_permission_updated",
            entity_type: "user_area",
            entity_id: userId,
            actor,
            ip,
            details: {
              userId,
              areaId,
              permission,
              changedBy: managerId,
            },
          });
        } catch (_) {}

        res.json({
          message: "User permission updated",
          userId,
          areaId,
          permission,
        });
      });
    });
  });
});

// DELETE /api/areas/:id/users/:userId - Remove user from an area
// Only global admins can do this
router.delete("/:id/users/:userId", requireAuth, (req, res) => {
  const { id: areaId, userId } = req.params;
  const managerId = req.userId;
  const managerRole = req.userRole;
  const actor = req.headers["x-user"] || "unknown";
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || null;

  // Only global admins can manage area permissions
  if (managerRole !== ROLES.ADMIN) {
    return res.status(403).json({
      error: "Only admins can manage area permissions",
    });
  }

  // Verify the area exists
  const checkAreaSql = `SELECT id FROM areas WHERE id = ? LIMIT 1`;
  db.query(checkAreaSql, [areaId], (err, areaResults) => {
    if (err || areaResults.length === 0) {
      return res.status(404).json({
        error: "Area not found",
      });
    }

    // Remove the user from the area
    const deleteSql = `
      DELETE FROM user_area_mapping 
      WHERE user_id = ? AND area_id = ?
      LIMIT 1
    `;

    db.query(deleteSql, [userId, areaId], async (err2) => {
      if (err2) {
        console.error("❌ Remove user from area error:", err2);
        return res.status(500).json({ error: "Database error" });
      }

      try {
        await writeAudit({
          action: "area_user_removed",
          entity_type: "user_area",
          entity_id: userId,
          actor,
          ip,
          details: {
            userId,
            areaId,
            removedBy: managerId,
          },
        });
      } catch (_) {}

      res.json({
        message: "User removed from area",
        userId,
        areaId,
      });
    });
  });
});

// POST /api/areas/:id/users/search - Search users to add to area
// Returns users not yet assigned to this area
// Only global admins can do this
router.post("/:id/users/search", requireAuth, (req, res) => {
  const { id: areaId } = req.params;
  const { query } = req.body;
  const managerId = req.userId;
  const managerRole = req.userRole;
  const actor = req.headers["x-user"] || "unknown";
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || null;

  // Only global admins can manage area permissions
  if (managerRole !== ROLES.ADMIN) {
    return res.status(403).json({
      error: "Only admins can manage area permissions",
    });
  }

  // Verify the area exists
  const checkAreaSql = `SELECT id FROM areas WHERE id = ? LIMIT 1`;
  db.query(checkAreaSql, [areaId], (err, areaResults) => {
    if (err || areaResults.length === 0) {
      return res.status(404).json({
        error: "Area not found",
      });
    }

    // Get users not yet assigned to this area (excluding admins)
    const searchTerm = `%${query}%`;
    const sql = `
      SELECT u.id, u.username, u.name, u.lastname, u.role
      FROM users u
      WHERE (u.username LIKE ? OR u.name LIKE ? OR u.lastname LIKE ?)
      AND u.role != 'admin'
      AND u.id NOT IN (
        SELECT user_id FROM user_area_mapping WHERE area_id = ?
      )
      ORDER BY u.name ASC
      LIMIT 20
    `;

    db.query(
      sql,
      [searchTerm, searchTerm, searchTerm, areaId],
      async (err2, results) => {
        if (err2) {
          console.error("❌ Search users for area error:", err2);
          return res.status(500).json({ error: "Database error" });
        }

        try {
          await writeAudit({
            action: "area_users_searched",
            entity_type: "area",
            entity_id: areaId,
            actor,
            ip,
            details: { query },
          });
        } catch (_) {}

        res.json({ users: results });
      },
    );
  });
});

// POST /api/areas/:id/users - Add user to area
// Only global admins can do this
router.post("/:id/users", requireAuth, (req, res) => {
  const { id: areaId } = req.params;
  const { userId, permission } = req.body;
  const managerId = req.userId;
  const managerRole = req.userRole;
  const actor = req.headers["x-user"] || "unknown";
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || null;

  // Only global admins can manage area permissions
  if (managerRole !== ROLES.ADMIN) {
    return res.status(403).json({
      error: "Only admins can manage area permissions",
    });
  }

  // Validate permission - must be 'read' or 'update'
  const validPermissions = ["read", "update"];
  const finalPermission = validPermissions.includes(permission)
    ? permission
    : "read";

  // Verify the area exists
  const checkAreaSql = `SELECT id FROM areas WHERE id = ? LIMIT 1`;
  db.query(checkAreaSql, [areaId], (err, areaResults) => {
    if (err || areaResults.length === 0) {
      return res.status(404).json({
        error: "Area not found",
      });
    }

    // Check if user being added is an admin, don't allow adding admins to areas
    const checkUserRoleSql = `
      SELECT u.role
      FROM users u
      WHERE u.id = ?
      LIMIT 1
    `;

    db.query(checkUserRoleSql, [userId], (err3, userResults) => {
      if (err3 || userResults.length === 0) {
        return res.status(500).json({ error: "Database error" });
      }

      const addedUserRole = userResults[0].role;
      const isAdmin = addedUserRole === ROLES.ADMIN;

      // Don't allow adding admins to areas at all
      if (isAdmin) {
        return res.status(403).json({
          error: "System admins cannot be assigned to specific areas",
        });
      }

      // Add user to area
      const sql = `
        INSERT INTO user_area_mapping (user_id, area_id, permission, assigned_by)
        VALUES (?, ?, ?, ?)
      `;

      db.query(
        sql,
        [userId, areaId, finalPermission, managerId],
        async (err2) => {
          if (err2) {
            if (err2.code === "ER_DUP_ENTRY") {
              return res.status(409).json({
                error: "User is already assigned to this area",
              });
            }
            console.error("❌ Add user to area error:", err2);
            return res.status(500).json({ error: "Database error" });
          }

          try {
            await writeAudit({
              action: "area_user_added",
              entity_type: "user_area",
              entity_id: userId,
              actor,
              ip,
              details: {
                userId,
                areaId,
                permission: finalPermission,
                addedBy: managerId,
              },
            });
          } catch (_) {}

          res.status(201).json({
            message: "User added to area",
            userId,
            areaId,
            permission: finalPermission,
          });
        },
      );
    });
  });
});

module.exports = router;
