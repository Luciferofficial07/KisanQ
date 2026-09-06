const express = require("express");
const { pool } = require("../config/db");
const { sendSms } = require("../utils/twilioClient");

const router = express.Router();

// Admin login
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (
    username !== process.env.ADMIN_USERNAME ||
    password !== process.env.ADMIN_PASSWORD
  ) {
    return res.status(401).json({
      success: false,
      message: "Invalid username or password."
    });
  }

  res.json({
    success: true,
    admin: {
      username,
      displayName: "Admin Sharma"
    }
  });
});

// Get ALL bookings for admin
router.get("/bookings", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM bookings
      ORDER BY created_at DESC
    `);

    res.json({
      success: true,
      bookings: result.rows
    });
  } catch (err) {
    console.error("Admin bookings failed:", err.message);

    res.status(500).json({
      success: false,
      message: "Could not fetch bookings."
    });
  }
});

// Call next farmer
router.post("/call-next", async (req, res) => {
  const { centre_pincode } = req.body;

  if (!centre_pincode) {
    return res.status(400).json({
      success: false,
      message: "centre_pincode is required."
    });
  }

  try {
    const found = await pool.query(
      `SELECT *
       FROM bookings
       WHERE centre_pincode = $1
       AND status = 'booked'
       ORDER BY created_at ASC
       LIMIT 1`,
      [centre_pincode]
    );

    if (!found.rows.length) {
      return res.status(404).json({
        success: false,
        message: "No farmers waiting."
      });
    }

    const next = found.rows[0];

    await pool.query(
      "UPDATE bookings SET status = 'called' WHERE id = $1",
      [next.id]
    );

    sendSms(
      next.phone,
      `KisanQ: your token ${next.token} is now being called. Please reach the counter.`
    ).catch(() => {});

    res.json({
      success: true,
      booking: {
        ...next,
        status: "called"
      }
    });
  } catch (err) {
    console.error("call-next failed:", err.message);

    res.status(500).json({
      success: false,
      message: "Could not call next token."
    });
  }
});

module.exports = router;