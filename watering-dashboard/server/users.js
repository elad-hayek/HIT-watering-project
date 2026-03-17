const express = require("express");
const router = express.Router();
const db = require("./Database");
const { writeAudit } = require("./logs");
const {
  ROLES,
  canAssignRole,
  getAssignableRoles,
  getRoleDisplayName,
} = require("./rbac");
const { requireAuth, requireRole, requireAdmin } = require("./rbacMiddleware");

// POST /api/users/register
// Register a new user - they are assigned 'user' role by default
router.post("/register", (req, res) => {
  const { username, password, lastname, name, city } = req.body;
  const actor = req.headers["x-user"] || String(username || "");
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || null;

  if (!username || !password) {
    return res.status(400).json({ error: "ID and password are required" });
  }

  if (!/^\d{9}$/.test(String(username))) {
    return res.status(400).json({ error: "ID must be exactly 9 digits" });
  }

  db.query(
    "SELECT 1 FROM users WHERE username = ? LIMIT 1",
    [username],
    (err, rows) => {
      if (err) {
        console.error("❌ Check ID DB error:", err);
        return res.status(500).json({ error: "Database error" });
      }
      if (rows.length > 0) {
        return res.status(409).json({ error: "ID already exists" });
      }

      // Auto-assign 'user' role on registration
      const sql = `
            INSERT INTO users (username, password, lastname, name, city, role)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
      db.query(
        sql,
        [username, password, lastname, name, city, ROLES.USER],
        async (err2, result) => {
          if (err2) {
            console.error("❌ Register DB error:", err2);
            return res.status(500).json({ error: "Database error" });
          }

          try {
            await writeAudit({
              action: "user_register",
              entity_type: "user",
              entity_id: result.insertId,
              actor,
              ip,
              details: { username, role: ROLES.USER },
            });
          } catch (_) {}

          res.status(201).json({
            message: "User registered with User role",
            userId: result.insertId,
          });
        },
      );
    },
  );
});

// POST /api/users/login
router.post("/login", (req, res) => {
  const { username, password } = req.body;
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || null;

  if (!username || !password) {
    return res.status(400).json({ error: "Missing ID or password" });
  }
  if (!/^\d{9}$/.test(String(username))) {
    return res.status(400).json({ error: "ID must be exactly 9 digits" });
  }

  const sql = `SELECT id, username, password, lastname, name, title, city, role
                 FROM users WHERE username = ? LIMIT 1`;

  db.query(sql, [username], async (err, rows) => {
    if (err) {
      console.error("❌ Login DB error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (rows.length === 0) {
      try {
        await writeAudit({
          action: "user_login_failed",
          entity_type: "user",
          actor: username,
          ip,
          details: { reason: "user_not_found" },
        });
      } catch (_) {}
      return res.status(401).json({ error: "Invalid ID or password" });
    }

    const user = rows[0];
    if (user.password !== password) {
      try {
        await writeAudit({
          action: "user_login_failed",
          entity_type: "user",
          entity_id: user.id,
          actor: username,
          ip,
          details: { reason: "invalid_password" },
        });
      } catch (_) {}
      return res.status(401).json({ error: "Invalid ID or password" });
    }

    try {
      await writeAudit({
        action: "user_login",
        entity_type: "user",
        entity_id: user.id,
        actor: username,
        ip,
      });
    } catch (_) {}

    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        lastname: user.lastname,
        title: user.title,
        city: user.city,
        role: user.role,
      },
    });
  });
});

// GET /api/users/:id
router.get("/:id", (req, res) => {
  const { id } = req.params;
  const sql = `SELECT id, username, lastname, name, title, city, role, created_at FROM users WHERE id = ? LIMIT 1`;

  db.query(sql, [id], (err, rows) => {
    if (err) {
      console.error("❌ Get user DB error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user: rows[0] });
  });
});

// GET /api/users - Get all users (for user management) - Admin only
router.get("/", requireAdmin, (req, res) => {
  const sql = `SELECT id, username, lastname, name, title, city, role, created_at FROM users ORDER BY created_at DESC`;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error("❌ Get users DB error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    res.json({
      users: rows.map((u) => ({
        ...u,
        roleDisplay: getRoleDisplayName(u.role),
      })),
    });
  });
});

// GET /api/users/search/:query - Search users by name or username - Admin only
router.get("/search/:query", requireAdmin, (req, res) => {
  const { query } = req.params;
  const searchTerm = `%${query}%`;

  const sql = `SELECT id, username, lastname, name, title, city, role, created_at 
               FROM users 
               WHERE username LIKE ? OR name LIKE ? OR lastname LIKE ?
               ORDER BY created_at DESC
               LIMIT 50`;

  db.query(sql, [searchTerm, searchTerm, searchTerm], (err, rows) => {
    if (err) {
      console.error("❌ Search users DB error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    res.json({
      users: rows.map((u) => ({
        ...u,
        roleDisplay: getRoleDisplayName(u.role),
      })),
    });
  });
});

// PUT /api/users/:id/role - Update user role
// Only admins can change roles, and must follow hierarchy rules
router.put("/:id/role", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { newRole } = req.body;
  const userId = req.userId;
  const userRole = req.userRole;
  const actor = req.headers["x-user"] || "unknown";
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || null;

  // Check if user has permission to change roles
  if (!canAssignRole(userRole, newRole)) {
    return res.status(403).json({
      error: "You do not have permission to assign this role",
      userRole,
      attemptedRole: newRole,
    });
  }

  // Get target user
  db.query(
    "SELECT id, role, username FROM users WHERE id = ? LIMIT 1",
    [id],
    (err, rows) => {
      if (err) {
        console.error("❌ Get target user DB error:", err);
        return res.status(500).json({ error: "Database error" });
      }

      if (rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      const targetUser = rows[0];
      const oldRole = targetUser.role;

      // Update role
      db.query(
        "UPDATE users SET role = ? WHERE id = ? LIMIT 1",
        [newRole, id],
        async (err2) => {
          if (err2) {
            console.error("❌ Update role DB error:", err2);
            return res.status(500).json({ error: "Database error" });
          }

          try {
            await writeAudit({
              action: "user_role_change",
              entity_type: "user",
              entity_id: id,
              actor,
              ip,
              details: {
                username: targetUser.username,
                oldRole,
                newRole,
                changedBy: userId,
              },
            });
          } catch (_) {}

          res.json({
            message: "User role updated",
            userId: id,
            oldRole,
            newRole,
            roleDisplay: getRoleDisplayName(newRole),
          });
        },
      );
    },
  );
});

// POST /api/users/:userId/areas/:areaId - Assign area to user (Admin only)
// This is for admins to assign areas to users
// Request body: { permission: 'read' | 'update' }
router.post(
  "/:userId/areas/:areaId",
  requireRole(ROLES.ADMIN),
  async (req, res) => {
    const { userId, areaId } = req.params;
    const { permission } = req.body;
    const managerRole = req.userRole;
    const managerId = req.userId;
    const actor = req.headers["x-user"] || "unknown";
    const ip =
      req.headers["x-forwarded-for"] || req.socket.remoteAddress || null;

    // Validate permission
    const validPermissions = ["read", "update"];
    const finalPermission = validPermissions.includes(permission)
      ? permission
      : "read";

    // Get target user to verify they are lower role
    db.query(
      "SELECT role FROM users WHERE id = ? LIMIT 1",
      [userId],
      (err, rows) => {
        if (err) {
          console.error("❌ Get user role DB error:", err);
          return res.status(500).json({ error: "Database error" });
        }

        if (rows.length === 0) {
          return res.status(404).json({ error: "User not found" });
        }

        const targetRole = rows[0].role;

        // Admin can assign areas to any user
        // The canAssignRole check ensures permission validation
        if (!canAssignRole(managerRole, targetRole)) {
          return res.status(403).json({
            error: "You cannot assign areas to users of equal or higher role",
          });
        }

        // Insert area mapping with permission
        const sql = `INSERT INTO user_area_mapping (user_id, area_id, permission, assigned_by) 
                   VALUES (?, ?, ?, ?)
                   ON DUPLICATE KEY UPDATE permission = ?, assigned_at = CURRENT_TIMESTAMP`;

        db.query(
          sql,
          [userId, areaId, finalPermission, managerId, finalPermission],
          async (err2) => {
            if (err2) {
              console.error("❌ Assign area DB error:", err2);
              return res.status(500).json({ error: "Database error" });
            }

            try {
              await writeAudit({
                action: "area_assigned_to_user",
                entity_type: "user_area",
                entity_id: userId,
                actor,
                ip,
                details: {
                  userId,
                  areaId,
                  permission: finalPermission,
                  assignedBy: managerId,
                },
              });
            } catch (_) {}

            res.json({
              message: "Area assigned to user",
              userId,
              areaId,
              permission: finalPermission,
            });
          },
        );
      },
    );
  },
);

// DELETE /api/users/:userId/areas/:areaId - Remove area from user (Admin only)
router.delete(
  "/:userId/areas/:areaId",
  requireRole(ROLES.ADMIN),
  async (req, res) => {
    const { userId, areaId } = req.params;
    const actor = req.headers["x-user"] || "unknown";
    const ip =
      req.headers["x-forwarded-for"] || req.socket.remoteAddress || null;

    const sql = `DELETE FROM user_area_mapping WHERE user_id = ? AND area_id = ? LIMIT 1`;

    db.query(sql, [userId, areaId], async (err) => {
      if (err) {
        console.error("❌ Remove area DB error:", err);
        return res.status(500).json({ error: "Database error" });
      }

      try {
        await writeAudit({
          action: "area_removed_from_user",
          entity_type: "user_area",
          entity_id: userId,
          actor,
          ip,
          details: { userId, areaId },
        });
      } catch (_) {}

      res.json({
        message: "Area removed from user",
        userId,
        areaId,
      });
    });
  },
);

// GET /api/users/:userId/areas - Get areas assigned to a user
router.get("/:userId/areas", (req, res) => {
  const { userId } = req.params;

  const sql = `SELECT a.*, uam.permission FROM areas a
               INNER JOIN user_area_mapping uam ON a.id = uam.area_id
               WHERE uam.user_id = ?
               ORDER BY a.created_at DESC`;

  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error("❌ Get user areas DB error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    res.json({ areas: results });
  });
});

// DELETE /api/users/:id - Delete a user (Admin only)
router.delete("/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const currentUserId = req.userId;
  const actor = req.headers["x-user"] || "unknown";
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || null;

  // Check if admin is trying to delete themselves
  if (currentUserId === parseInt(id)) {
    return res
      .status(400)
      .json({ error: "You cannot delete your own account" });
  }

  // Get user details before deleting
  const getUserSql = `SELECT username, name, lastname FROM users WHERE id = ? LIMIT 1`;

  db.query(getUserSql, [id], (err, results) => {
    if (err) {
      console.error("❌ Get user DB error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const userData = results[0];

    // Delete the user
    const deleteSql = `DELETE FROM users WHERE id = ? LIMIT 1`;

    db.query(deleteSql, [id], async (err2) => {
      if (err2) {
        console.error("❌ Delete user DB error:", err2);
        return res.status(500).json({ error: "Database error" });
      }

      try {
        await writeAudit({
          action: "user_deleted",
          entity_type: "user",
          entity_id: id,
          actor,
          ip,
          details: {
            username: userData.username,
            name: userData.name,
            lastname: userData.lastname,
            deletedBy: currentUserId,
          },
        });
      } catch (_) {}

      res.json({
        message: "User deleted successfully",
        userId: id,
      });
    });
  });
});

module.exports = router;
