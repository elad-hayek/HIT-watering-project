const express = require("express");
const router = express.Router();
const db = require("./Database");

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

// GET /api/audit - Get audit logs
router.get("/", (req, res) => {
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
router.get("/entity/:type/:id", (req, res) => {
  const { type, id } = req.params;
  const limit = parseInt(req.query.limit) || 50;

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
});

module.exports = { router, writeAudit };
exports.writeAudit = writeAudit;
