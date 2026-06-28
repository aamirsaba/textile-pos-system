const { Client } = require("pg");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigrations() {
  try {
    await client.connect();
    console.log("Connected to database");
    
    const migrationsDir = path.join(__dirname, "..", "database", "migrations");
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith(".sql")).sort();
    
    console.log("Found " + files.length + " migration files");
    
    for (const file of files) {
      console.log("Running migration: " + file);
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      await client.query(sql);
      console.log("Completed: " + file);
    }
    
    console.log("All migrations completed successfully!");
  } catch (error) {
    console.error("Error running migrations:", error.message);
  } finally {
    await client.end();
  }
}

runMigrations();
