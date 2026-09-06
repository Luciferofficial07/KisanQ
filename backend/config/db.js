const { Pool, Client } = require("pg");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const baseConfig = {
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || "postgres",
  password: String(process.env.DB_PASSWORD ?? "")
};

const pool = new Pool({
  ...baseConfig,
  database: process.env.DB_NAME || "kisanq"
});

pool.on("error", (err) => {
  console.error("PostgreSQL pool error:", err.message);
});

async function initDb() {
  const dbName = process.env.DB_NAME || "kisanq";
  const admin = new Client({ ...baseConfig, database: "postgres" });
  await admin.connect();
  const found = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
  if (!found.rowCount) {
    await admin.query(`CREATE DATABASE ${dbName.replace(/[^a-zA-Z0-9_]/g, "")}`);
    console.log("Created database", dbName);
  }
  await admin.end();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS farmers (
      id SERIAL PRIMARY KEY,
      phone VARCHAR(10) NOT NULL UNIQUE,
      name VARCHAR(100) DEFAULT 'Farmer',
      village VARCHAR(120) DEFAULT '',
      language VARCHAR(8) DEFAULT 'en',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      token TEXT NOT NULL UNIQUE,
      phone VARCHAR(10) NOT NULL,
      farmer_name VARCHAR(100),
      centre_name VARCHAR(150) NOT NULL,
      centre_pincode VARCHAR(6) NOT NULL,
      booking_date DATE NOT NULL,
      slot VARCHAR(40) NOT NULL,
      crop VARCHAR(40),
      quantity NUMERIC(10,2),
      status VARCHAR(20) DEFAULT 'booked',
      amount NUMERIC(10,2),
      razorpay_order_id VARCHAR(64),
      razorpay_payment_id VARCHAR(64),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log("PostgreSQL ready.");
}

module.exports = { pool, initDb };
