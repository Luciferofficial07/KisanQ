const express = require("express");
const { pool } = require("../config/db");
const { sendOtp, checkOtp } = require("../utils/twilioClient");

const router = express.Router();

router.post("/send-otp", async (req, res) => {
  const phone = (req.body.phone || "").trim();

  if (!/^\d{10}$/.test(phone)) {
    return res.status(400).json({ success: false, message: "Enter a valid 10-digit mobile number." });
  }

  try {
    await sendOtp(phone);
    res.json({ success: true, message: "OTP sent to your mobile." });
  } catch (err) {
    console.error("Twilio send-otp failed:", err.message);
    res.status(500).json({
      success: false,
      message:
        "Could not send OTP. Twilio trial accounts can SMS only numbers verified in the Twilio console."
    });
  }
});

router.post("/verify-otp", async (req, res) => {
  const phone = (req.body.phone || "").trim();
  const otp = (req.body.otp || "").trim();
  const name = (req.body.name || "Farmer").trim() || "Farmer";
  const village = (req.body.village || "").trim();
  const language = req.body.language || "en";

  if (!/^\d{10}$/.test(phone) || !otp) {
    return res.status(400).json({ success: false, message: "Phone and OTP are required." });
  }

  try {
    const approved = await checkOtp(phone, otp);
    if (!approved) {
      return res.status(401).json({ success: false, message: "Invalid or expired OTP." });
    }

    let farmer = { phone, name, village, language };
    try {
      const existing = await pool.query("SELECT * FROM farmers WHERE phone = $1", [phone]);
      if (existing.rows.length) {
        const updated = await pool.query(
          `UPDATE farmers SET name = COALESCE(NULLIF($1, ''), name), village = COALESCE($2, village), language = $3
           WHERE phone = $4 RETURNING *`,
          [name, village, language, phone]
        );
        farmer = updated.rows[0];
      } else {
        const inserted = await pool.query(
          `INSERT INTO farmers (name, phone, village, language) VALUES ($1, $2, $3, $4) RETURNING *`,
          [name, phone, village, language]
        );
        farmer = inserted.rows[0];
      }
    } catch (dbErr) {
      console.error("Farmer save failed:", dbErr.message);
    }

    res.json({ success: true, farmer });
  } catch (err) {
    console.error("verify-otp failed:", err.message);
    res.status(500).json({ success: false, message: "Verification failed." });
  }
});

module.exports = router;
