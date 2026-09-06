const express = require("express");
const { pool } = require("../config/db");
const { sendSms } = require("../utils/twilioClient");

const router = express.Router();

function uniqueToken() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = require("crypto").randomBytes(6);
  return "KQ-" + Array.from(bytes, (n) => alphabet[n % alphabet.length]).join("");
}

router.post("/", async (req, res) => {
  const { phone, farmer_name, centre_name, centre_pincode, booking_date, slot, crop, quantity } = req.body;
  if (!phone || !centre_name || !centre_pincode || !booking_date || !slot || !quantity) {
    return res.status(400).json({ success: false, message: "Missing required booking fields." });
  }

  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const token = uniqueToken();

  try {
    await pool.query(
      `INSERT INTO bookings
        (id, token, phone, farmer_name, centre_name, centre_pincode, booking_date, slot, crop, quantity, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'booked')`,
      [id, token, phone, farmer_name || "Farmer", centre_name, centre_pincode, booking_date, slot, crop, quantity]
    );
    sendSms(phone, `KisanQ: booking confirmed. Token ${token}. ${centre_name}, ${booking_date}, ${slot}`).catch(() => {});
    res.json({ success: true, booking: { id, token, phone, centre_name, centre_pincode, booking_date, slot, crop, quantity, status: "booked" } });
  } catch (err) {
    console.error("Create booking failed:", err.message);
    res.status(500).json({ success: false, message: "Could not create booking." });
  }
});

router.get("/", async (req, res) => {
  const { phone, centre_pincode, date } = req.query;
  try {
    if (phone) {
      const { rows } = await pool.query("SELECT * FROM bookings WHERE phone = $1 ORDER BY created_at DESC", [phone]);
      return res.json({ success: true, bookings: rows });
    }
    if (centre_pincode) {
      const params = [centre_pincode];
      let sql = "SELECT * FROM bookings WHERE centre_pincode = $1";
      if (date) {
        sql += " AND booking_date = $2";
        params.push(date);
      }
      sql += " ORDER BY created_at ASC";
      const { rows } = await pool.query(sql, params);
      return res.json({ success: true, bookings: rows });
    }
    res.status(400).json({ success: false, message: "Pass phone or centre_pincode." });
  } catch (err) {
    console.error("Fetch bookings failed:", err.message);
    res.status(500).json({ success: false, message: "Could not fetch bookings." });
  }
});

router.patch("/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!["called", "accepted", "rejected", "procured", "paid", "cancelled"].includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid status." });
  }
  try {
    const found = await pool.query("SELECT * FROM bookings WHERE id = $1", [id]);
    if (!found.rows.length) return res.status(404).json({ success: false, message: "Booking not found." });
    await pool.query("UPDATE bookings SET status = $1 WHERE id = $2", [status, id]);
    sendSms(found.rows[0].phone, `KisanQ: token ${found.rows[0].token} is now ${status}.`).catch(() => {});
    res.json({ success: true });
  } catch (err) {
    console.error("Update status failed:", err.message);
    res.status(500).json({ success: false, message: "Could not update status." });
  }
});

module.exports = router;
