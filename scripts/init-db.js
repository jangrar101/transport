require("dotenv").config();

const fs = require("node:fs");
const path = require("node:path");
const mysql = require("mysql2/promise");

async function initializeDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || "localhost",
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    multipleStatements: true
  });

  try {
    const schema = fs.readFileSync(path.join(__dirname, "..", "database", "schema.sql"), "utf8");
    await connection.query(schema);
    console.log("HaulHub database, tables, and demo records are ready.");
  } finally {
    await connection.end();
  }
}

initializeDatabase().catch(error => {
  console.error("Database setup failed:", error.message);
  process.exitCode = 1;
});
