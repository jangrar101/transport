require("dotenv").config();

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const mysql = require("mysql2/promise");

const root = __dirname;
const port = Number(process.env.PORT || 3000);
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || "localhost",
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DATABASE || "haulhub",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": contentTypes[".json"],
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(payload));
}

async function readJson(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (Buffer.byteLength(body) > 1024 * 1024) {
      const error = new Error("Request body is too large.");
      error.status = 413;
      throw error;
    }
  }

  try {
    return JSON.parse(body);
  } catch {
    const error = new Error("Request body must be valid JSON.");
    error.status = 400;
    throw error;
  }
}

async function getDashboard() {
  const [[fleet]] = await pool.query(`
    SELECT COUNT(*) AS total,
      COALESCE(SUM(status = 'available'), 0) AS available
    FROM trucks
  `);
  const [[bookingStats]] = await pool.query(`
    SELECT COUNT(*) AS total,
      COALESCE(SUM(status IN ('requested', 'confirmed', 'in_transit')), 0) AS active
    FROM bookings
  `);
  return {
    totalFleet: Number(fleet.total),
    availableTrucks: Number(fleet.available),
    totalBookings: Number(bookingStats.total),
    activeBookings: Number(bookingStats.active)
  };
}

async function routeApi(request, response, pathname) {
  if (request.method === "GET" && pathname === "/api/dashboard") {
    return sendJson(response, 200, await getDashboard());
  }

  if (request.method === "GET" && pathname === "/api/trucks") {
    const [rows] = await pool.query(`
      SELECT t.truck_number AS id, t.plate_number AS plate,
        COALESCE(d.full_name, 'Unassigned') AS driver,
        d.phone AS driverPhone, t.location,
        CONCAT(t.capacity_tonnes + 0, ' tonnes') AS capacity,
        t.capacity_tonnes AS capacityTonnes, t.status
      FROM trucks t
      LEFT JOIN drivers d ON d.id = t.driver_id
      ORDER BY t.truck_number
    `);
    return sendJson(response, 200, rows);
  }

  if (request.method === "GET" && pathname === "/api/drivers") {
    const [rows] = await pool.query(`
      SELECT d.full_name AS name, d.phone, d.email, d.license_number AS licenseNumber,
        d.status, t.truck_number AS truck, t.plate_number AS plate,
        t.capacity_tonnes AS capacityTonnes, t.location
      FROM drivers d
      LEFT JOIN trucks t ON t.driver_id = d.id
      ORDER BY d.full_name
    `);
    return sendJson(response, 200, rows);
  }

  if (request.method === "GET" && pathname === "/api/companies") {
    const [rows] = await pool.query(`
      SELECT c.id, c.name, c.city, c.contact_name AS contactName,
        c.phone, c.email, c.account_status AS status,
        COUNT(b.id) AS bookingCount
      FROM companies c
      LEFT JOIN bookings b ON b.company_id = c.id
      GROUP BY c.id
      ORDER BY c.name
    `);
    return sendJson(response, 200, rows);
  }

  if (request.method === "GET" && pathname === "/api/bookings") {
    const [rows] = await pool.query(`
      SELECT b.booking_code AS id, c.name AS company,
        b.pickup_city AS pickup, b.drop_city AS dropoff,
        b.load_type AS loadType, b.weight_tonnes AS weightTonnes,
        b.status, t.truck_number AS truck, d.full_name AS driver
      FROM bookings b
      JOIN companies c ON c.id = b.company_id
      LEFT JOIN trucks t ON t.id = b.truck_id
      LEFT JOIN drivers d ON d.id = t.driver_id
      ORDER BY b.created_at DESC, b.id DESC
    `);
    return sendJson(response, 200, rows);
  }

  if (request.method === "POST" && pathname === "/api/bookings") {
    const body = await readJson(request);
    const companyId = Number(body.companyId);
    const pickup = String(body.pickup || "").trim();
    const dropoff = String(body.dropoff || "").trim();
    const loadType = String(body.loadType || "").trim();
    const weightTonnes = Number(body.weightTonnes);

    if (
      !Number.isInteger(companyId) || companyId < 1 ||
      !pickup || pickup.length > 100 ||
      !dropoff || dropoff.length > 100 ||
      !loadType || loadType.length > 150 ||
      !Number.isFinite(weightTonnes) || weightTonnes <= 0 || weightTonnes > 999999
    ) {
      return sendJson(response, 400, { error: "Please provide valid booking details." });
    }

    const bookingCode = `BK-${Date.now()}`;
    const [result] = await pool.execute(`
      INSERT INTO bookings
        (booking_code, company_id, pickup_city, drop_city, load_type, weight_tonnes)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [bookingCode, companyId, pickup, dropoff, loadType, weightTonnes]);

    const [rows] = await pool.execute(`
      SELECT b.booking_code AS id, c.name AS company,
        b.pickup_city AS pickup, b.drop_city AS dropoff,
        b.load_type AS loadType, b.weight_tonnes AS weightTonnes,
        b.status, t.truck_number AS truck, d.full_name AS driver
      FROM bookings b
      JOIN companies c ON c.id = b.company_id
      LEFT JOIN trucks t ON t.id = b.truck_id
      LEFT JOIN drivers d ON d.id = t.driver_id
      WHERE b.id = ?
    `, [result.insertId]);
    return sendJson(response, 201, rows[0]);
  }

  sendJson(response, 404, { error: "API endpoint not found." });
}

function serveStatic(request, response, pathname) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    response.writeHead(400);
    response.end("Invalid URL.");
    return;
  }

  const relativePath = decodedPath === "/" ? "index.html" : decodedPath.slice(1);
  const filePath = path.resolve(root, relativePath);
  if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
    response.writeHead(403);
    response.end("Forbidden.");
    return;
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      response.writeHead(404);
      response.end("Not found.");
      return;
    }

    response.writeHead(200, {
      "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream"
    });
    fs.createReadStream(filePath).pipe(response);
  });
}

const server = http.createServer(async (request, response) => {
  const pathname = new URL(request.url, `http://${request.headers.host || "localhost"}`).pathname;
  if (pathname.startsWith("/api/")) {
    try {
      await routeApi(request, response, pathname);
    } catch (error) {
      console.error("API request failed:", error);
      sendJson(response, error.status || 503, {
        error: error.status ? error.message : "Database request failed. Check the MySQL setup and try again."
      });
    }
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end("Method not allowed.");
    return;
  }
  serveStatic(request, response, pathname);
});

server.listen(port, () => {
  console.log(`HaulHub is running at http://localhost:${port}`);
  pool.query("SELECT 1").then(() => {
    console.log("MySQL connection is ready.");
  }).catch(error => {
    console.error("MySQL connection failed:", error.message);
  });
});

function shutdown() {
  server.close(() => pool.end().finally(() => process.exit(0)));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
