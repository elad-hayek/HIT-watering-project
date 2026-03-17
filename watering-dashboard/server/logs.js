const express = require("express");
const router = express.Router();
const db = require("./Database");
const { ROLES, canViewActivity } = require("./rbac");
const { requireAuth, requireRole } = require("./rbacMiddleware");

// Write audit log entry
async function writeAudit(data) {
  const { action, entity_type, entity_id, actor, ip, details } = data;

  return new Promise((resolve, reject) => {
    const sql = `
            INSERT INTO audit_log (action, entity_type, entity_id, actor, ip_address, details)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

    db.query(
      sql,
      [
        action,
        entity_type || null,
        entity_id || null,
        actor,
        ip,
        details ? JSON.stringify(details) : null,
      ],
      (err, result) => {
        if (err) {
          console.error("❌ Audit log error:", err);
          reject(err);
        } else {
          resolve(result);
        }
      },
    );
  });
}

// GET /api/audit/logs - Get audit logs based on user role
// Only Area Managers and Admins can view activity
// Regular users cannot view activity
router.get("/logs", requireAuth, (req, res) => {
  const userId = req.userId;
  const userRole = req.userRole;

  // Check if user has permission to view activity
  if (!canViewActivity(userRole)) {
    return res
      .status(403)
      .json({ error: "You do not have permission to view activity" });
  }

  const limit = parseInt(req.query.limit) || 30;
  const offset = parseInt(req.query.offset) || 0;
  const filterUser = req.query.user ? req.query.user.trim() : "";
  const filterAction = req.query.action ? req.query.action.trim() : "";

  let whereConditions = [];
  let params = [];

  // Admins see all activity - no additional WHERE clause needed

  if (filterUser) {
    whereConditions.push("actor = ?");
    params.push(filterUser);
  }

  if (filterAction) {
    whereConditions.push("action = ?");
    params.push(filterAction);
  }

  const whereClause =
    whereConditions.length > 0 ? "WHERE " + whereConditions.join(" AND ") : "";

  // Get total count
  const countSql = `SELECT COUNT(*) as total FROM audit_log ${whereClause}`;
  db.query(countSql, params, (err, countResults) => {
    if (err) {
      console.error("❌ Get audit count error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    const total = countResults[0].total;

    // Get paginated logs
    const sql = `
          SELECT * FROM audit_log 
          ${whereClause}
          ORDER BY created_at DESC 
          LIMIT ? OFFSET ?
      `;

    db.query(sql, [...params, limit, offset], (err, results) => {
      if (err) {
        console.error("❌ Get audit logs error:", err);
        return res.status(500).json({ error: "Database error" });
      }

      res.json({
        logs: results,
        total: total,
        limit,
        offset,
      });
    });
  });
});

// GET /api/audit/filters - Get available users and actions for filtering
// Only Area Managers and Admins can view activity
router.get("/filters", requireAuth, (req, res) => {
  const userId = req.userId;
  const userRole = req.userRole;

  // Check if user has permission to view activity
  if (!canViewActivity(userRole)) {
    return res
      .status(403)
      .json({ error: "You do not have permission to view activity" });
  }

  let usersSql, actionsSql;

  // Admin sees all
  usersSql = `SELECT DISTINCT actor FROM audit_log WHERE actor IS NOT NULL ORDER BY actor ASC`;
  actionsSql = `SELECT DISTINCT action FROM audit_log WHERE action IS NOT NULL ORDER BY action ASC`;

  db.query(usersSql, [], (err, usersResults) => {
    if (err) {
      console.error("❌ Get users error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    db.query(actionsSql, [], (err2, actionsResults) => {
      if (err2) {
        console.error("❌ Get actions error:", err2);
        return res.status(500).json({ error: "Database error" });
      }

      const users = usersResults.map((row) => row.actor);
      const actions = actionsResults.map((row) => row.action);

      res.json({ users, actions });
    });
  });
});

// GET /api/audit - Get audit logs (deprecated, use /logs instead)
// Only Admins can access this endpoint
router.get("/", requireRole(ROLES.ADMIN), (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const offset = parseInt(req.query.offset) || 0;

  const sql = `
        SELECT * FROM audit_log 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
    `;

  db.query(sql, [limit, offset], (err, results) => {
    if (err) {
      console.error("❌ Get audit logs error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    // Get total count
    const countSql = `SELECT COUNT(*) as total FROM audit_log`;
    db.query(countSql, (err2, countResults) => {
      if (err2) {
        console.error("❌ Get audit count error:", err2);
        return res.status(500).json({ error: "Database error" });
      }

      res.json({
        logs: results,
        total: countResults[0].total,
        limit,
        offset,
      });
    });
  });
});

// GET /api/audit/entity/:type/:id - Get logs for specific entity
// Check access based on role
router.get("/entity/:type/:id", requireAuth, (req, res) => {
  const { type, id } = req.params;
  const userId = req.userId;
  const userRole = req.userRole;
  const limit = parseInt(req.query.limit) || 50;

  // Only admins can view entity logs
  if (userRole !== ROLES.ADMIN) {
    return res
      .status(403)
      .json({ error: "You do not have permission to view activity" });
  }

  // Verify the entity exists
  if (type === "area") {
    const checkSql = `SELECT id FROM areas WHERE id = ? LIMIT 1`;
    db.query(checkSql, [id], (err, results) => {
      if (err || results.length === 0) {
        return res.status(404).json({ error: "Entity not found" });
      }
      fetchLogs();
    });
  } else if (type === "plant") {
    const checkSql = `SELECT id FROM plants WHERE id = ? LIMIT 1`;
    db.query(checkSql, [id], (err, results) => {
      if (err || results.length === 0) {
        return res.status(404).json({ error: "Entity not found" });
      }
      fetchLogs();
    });
  } else {
    return res.status(400).json({ error: "Invalid entity type" });
  }

  function fetchLogs() {
    const sql = `
        SELECT * FROM audit_log 
        WHERE entity_type = ? AND entity_id = ?
        ORDER BY created_at DESC 
        LIMIT ?
    `;

    db.query(sql, [type, id, limit], (err, results) => {
      if (err) {
        console.error("❌ Get entity audit logs error:", err);
        return res.status(500).json({ error: "Database error" });
      }

      res.json({ logs: results });
    });
  }
});

module.exports = { router, writeAudit };
exports.writeAudit = writeAudit;
