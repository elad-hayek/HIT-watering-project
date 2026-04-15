const mysql = require("mysql2");
const fs = require("fs");
const path = require("path");

// Load environment variables
require("dotenv").config({ path: path.join(__dirname, ".env") });

// Database configuration from .env
const config = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "AdminMySql1234",
  database: process.env.DB_NAME || "watering_db",
};

async function runMigrations() {
  // First connection without database to drop and create the database
  const adminConnection = mysql.createConnection({
    host: config.host,
    user: config.user,
    password: config.password,
  });

  return new Promise((resolve, reject) => {
    adminConnection.connect((err) => {
      if (err) {
        console.error("❌ Failed to connect to MySQL:", err.message);
        reject(err);
        return;
      }

      console.log("✅ Connected to MySQL Server");

      // Drop database if exists
      console.log(`\n🗑️  Dropping existing database '${config.database}'...`);
      adminConnection.query(
        `DROP DATABASE IF EXISTS ${config.database}`,
        (err) => {
          if (err) {
            console.error("❌ Error dropping database:", err.message);
            adminConnection.end();
            reject(err);
            return;
          }

          console.log(`✅ Database dropped`);

          // Create database
          console.log(`\n📊 Creating database '${config.database}'...`);
          adminConnection.query(`CREATE DATABASE ${config.database}`, (err) => {
            if (err) {
              console.error("❌ Error creating database:", err.message);
              adminConnection.end();
              reject(err);
              return;
            }

            console.log(`✅ Database created successfully\n`);

            // Close admin connection and create migration connection
            adminConnection.end(() => {
              runMigrationFiles(config)
                .then(() => {
                  console.log("\n==========================================");
                  console.log("✅ All migrations completed successfully!");
                  console.log("==========================================");
                  resolve();
                })
                .catch(reject);
            });
          });
        },
      );
    });
  });
}

async function runMigrationFiles(config) {
  const migrationsDir = path.join(__dirname, "../database/migrations");
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql") && file.match(/^\d+_/))
    .sort();

  console.log(`📋 Found ${migrationFiles.length} migration(s):\n`);

  for (let i = 0; i < migrationFiles.length; i++) {
    const migrationFile = migrationFiles[i];
    const migrationPath = path.join(migrationsDir, migrationFile);
    const migration = fs.readFileSync(migrationPath, "utf8");

    await runMigration(
      migrationPath,
      migration,
      config,
      i + 1,
      migrationFiles.length,
    );
  }
}

async function runMigration(filePath, sql, config, index, total) {
  return new Promise((resolve, reject) => {
    const fileName = path.basename(filePath);
    console.log(`[${index}/${total}] Running migration: ${fileName}`);

    const connection = mysql.createConnection({
      host: config.host,
      user: config.user,
      password: config.password,
      database: config.database,
      multipleStatements: true,
    });

    connection.connect((err) => {
      if (err) {
        console.error(`❌ Connection error for ${fileName}:`, err.message);
        reject(err);
        return;
      }

      connection.query(sql, (err, results) => {
        connection.end();

        if (err) {
          console.error(`❌ Error in ${fileName}:`, err.message);
          reject(err);
          return;
        }

        console.log(`✅ Completed: ${fileName}\n`);
        resolve();
      });
    });
  });
}

// Run migrations
console.log("===========================================");
console.log("Database Migration Runner");
console.log("===========================================\n");
console.log(`Database: ${config.database}`);
console.log(`User: ${config.user}`);
console.log(`Host: ${config.host}\n`);

runMigrations().catch((err) => {
  console.error("\n❌ Migration failed:", err.message);
  process.exit(1);
});
