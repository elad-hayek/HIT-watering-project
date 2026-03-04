const express = require("express");
const router = express.Router();
const db = require("./Database");
const { writeAudit } = require("./logs");

// POST /api/users/register
router.post("/register", (req, res) => {
  const { username, password, lastname, name, title, city } = req.body;
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

      const sql = `
            INSERT INTO users (username, password, lastname, name, title, city)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
      db.query(
        sql,
        [username, password, lastname, name, title, city],
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
              details: { username },
            });
          } catch (_) {}

          res
            .status(201)
            .json({ message: "User registered", userId: result.insertId });
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

  const sql = `SELECT id, username, password, lastname, name, title, city
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
      },
    });
  });
});

// GET /api/users/:id
router.get("/:id", (req, res) => {
  const { id } = req.params;
  const sql = `SELECT id, username, lastname, name, title, city, created_at FROM users WHERE id = ? LIMIT 1`;

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

module.exports = router;
