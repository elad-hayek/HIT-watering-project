require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Folder for uploads + static files
const UPLOADS_DIR = path.join(__dirname, "uploads");
fs.mkdirSync(path.join(UPLOADS_DIR, "areas"), { recursive: true });
app.use("/uploads", express.static(UPLOADS_DIR));

// Connecting routes
const areasRouter = require("./areas");
const plantsRouter = require("./plants");
const usersRouter = require("./users");
const { router: logsRouter } = require("./logs");

// API Routes
app.use("/api/areas", areasRouter);
app.use("/api/plants", plantsRouter);
app.use("/api/users", usersRouter);
app.use("/api/audit", logsRouter);

// Health check
app.get("/api/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🌱 Watering Dashboard API running on http://localhost:" + PORT);
});
