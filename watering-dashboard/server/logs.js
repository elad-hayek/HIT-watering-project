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

  if (userRole === ROLES.AREA_MANAGER) {
    // Area managers see activity for their areas and related entities
    whereConditions.push(`
      (entity_type = 'area' AND entity_id IN (
        SELECT area_id FROM user_area_mapping WHERE user_id = ?
      ))
      OR
      (entity_type = 'plant' AND entity_id IN (
        SELECT p.id FROM plants p
        INNER JOIN user_area_mapping uam ON p.area_id = uam.area_id
        WHERE uam.user_id = ?
      ))
      OR
      (entity_type = 'user_area' AND details LIKE ?)
    `);
    params.push(
      userId,
      userId,
      JSON.stringify({ areaId: "%" }).substring(0, -3) + "%",
    );
  }
  // Admin sees all activity - no additional WHERE clause needed

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

  if (userRole === ROLES.AREA_MANAGER) {
    // Area managers see actors and actions from their areas only
    usersSql = `SELECT DISTINCT al.actor FROM audit_log al
                WHERE (
                  al.entity_type = 'area' AND al.entity_id IN (
                    SELECT area_id FROM user_area_mapping WHERE user_id = ?
                  )
                )
                OR (
                  al.entity_type = 'plant' AND al.entity_id IN (
                    SELECT p.id FROM plants p
                    INNER JOIN user_area_mapping uam ON p.area_id = uam.area_id
                    WHERE uam.user_id = ?
                  )
                )
                AND al.actor IS NOT NULL ORDER BY al.actor ASC`;

    actionsSql = `SELECT DISTINCT al.action FROM audit_log al
                 WHERE (
                   al.entity_type = 'area' AND al.entity_id IN (
                     SELECT area_id FROM user_area_mapping WHERE user_id = ?
                   )
                 )
                 OR (
                   al.entity_type = 'plant' AND al.entity_id IN (
                     SELECT p.id FROM plants p
                     INNER JOIN user_area_mapping uam ON p.area_id = uam.area_id
                     WHERE uam.user_id = ?
                   )
                 )
                 AND al.action IS NOT NULL ORDER BY al.action ASC`;
  } else {
    // Admin sees all
    usersSql = `SELECT DISTINCT actor FROM audit_log WHERE actor IS NOT NULL ORDER BY actor ASC`;
    actionsSql = `SELECT DISTINCT action FROM audit_log WHERE action IS NOT NULL ORDER BY action ASC`;
  }

  const userParams = userRole === ROLES.AREA_MANAGER ? [userId, userId] : [];
  const actionParams = userRole === ROLES.AREA_MANAGER ? [userId, userId] : [];

  db.query(usersSql, userParams, (err, usersResults) => {
    if (err) {
      console.error("❌ Get users error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    db.query(actionsSql, actionParams, (err2, actionsResults) => {
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

  // For area managers, check if they have access
  if (userRole === ROLES.AREA_MANAGER) {
    if (type === "area") {
      // Check if they manage this area
      const checkSql = `SELECT id FROM user_area_mapping WHERE user_id = ? AND area_id = ? LIMIT 1`;
      db.query(checkSql, [userId, id], (err, results) => {
        if (err || results.length === 0) {
          return res.status(403).json({ error: "Access denied" });
        }
        fetchLogs();
      });
    } else if (type === "plant") {
      // Check if they manage the plant's area
      const checkSql = `SELECT p.id FROM plants p
                       INNER JOIN user_area_mapping uam ON p.area_id = uam.area_id
                       WHERE p.id = ? AND uam.user_id = ? LIMIT 1`;
      db.query(checkSql, [id, userId], (err, results) => {
        if (err || results.length === 0) {
          return res.status(403).json({ error: "Access denied" });
        }
        fetchLogs();
      });
    } else {
      return res.status(403).json({ error: "Access denied" });
    }
  } else if (userRole === ROLES.USER) {
    return res
      .status(403)
      .json({ error: "You do not have permission to view activity" });
  } else {
    // Admin - no restrictions
    fetchLogs();
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
