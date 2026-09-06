const { Pool } = require("pg");
const path = require("path");

require("dotenv").config({
  path: path.join(__dirname, "..", ".env")
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  // Render PostgreSQL SSL connection
  ssl: process.env.DATABASE_URL
    ? { rejectUnauthorized: false }
    : false
});

pool.on("error", (err) => {
  console.error("PostgreSQL pool error:", err.message);
});

async function initDb() {
  // Test database connection
  await pool.query("SELECT NOW()");
  console.log("PostgreSQL connection successful.");

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

module.exports = {
  pool,
  initDb
};