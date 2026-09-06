const express = require("express");
const { pool } = require("../config/db");
const { createOrder, verifySignature } = require("../utils/razorpayClient");
const { sendSms } = require("../utils/twilioClient");

const router = express.Router();

router.post("/test-complete", async (req, res) => {
  if (!String(process.env.RAZORPAY_KEY_ID || "").startsWith("rzp_test_")) {
    return res.status(403).json({ success: false, message: "Test payments are only allowed with Razorpay test keys." });
  }
  const { booking_id, amount, payment_id, phone, token } = req.body || {};
  if (!booking_id || !amount || !payment_id) {
    return res.status(400).json({ success: false, message: "booking_id, amount and payment_id are required." });
  }
  try {
    await pool.query(
      `UPDATE bookings SET status = 'paid', amount = $1, razorpay_payment_id = $2 WHERE id = $3`,
      [amount, payment_id, booking_id]
    );
    if (phone) {
      sendSms(phone, `KisanQ: test payment received for token ${token || ""}. ₹${amount}`).catch(() => {});
    }
    res.json({ success: true, payment_id, mode: "test" });
  } catch (err) {
    console.error("Test payment save failed:", err.message);
    res.json({ success: true, payment_id, mode: "test", saved: false });
  }
});

router.post("/create-order", async (req, res) => {
  const { booking_id, amount } = req.body;
  if (!booking_id || !amount) {
    return res.status(400).json({ success: false, message: "booking_id and amount are required." });
  }
  try {
    const order = await createOrder({ amount, receipt: `booking_${booking_id}` });
    await pool.query("UPDATE bookings SET amount = $1, razorpay_order_id = $2 WHERE id = $3", [
      amount,
      order.id,
      booking_id
    ]);
    res.json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID
    });
  } catch (err) {
    console.error("Razorpay create-order failed:", err.message);
    res.status(500).json({ success: false, message: "Could not create payment order." });
  }
});

router.post("/verify", async (req, res) => {
  const { booking_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (!booking_id || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ success: false, message: "Missing payment verification fields." });
  }
  const valid = verifySignature({
    order_id: razorpay_order_id,
    payment_id: razorpay_payment_id,
    signature: razorpay_signature
  });
  if (!valid) return res.status(400).json({ success: false, message: "Payment signature mismatch." });
  try {
    const found = await pool.query("SELECT * FROM bookings WHERE id = $1", [booking_id]);
    if (!found.rows.length) return res.status(404).json({ success: false, message: "Booking not found." });
    await pool.query("UPDATE bookings SET status = 'paid', razorpay_payment_id = $1 WHERE id = $2", [
      razorpay_payment_id,
      booking_id
    ]);
    sendSms(found.rows[0].phone, `KisanQ: payment received for token ${found.rows[0].token}.`).catch(() => {});
    res.json({ success: true });
  } catch (err) {
    console.error("Payment verify failed:", err.message);
    res.status(500).json({ success: false, message: "Could not confirm payment." });
  }
});

module.exports = router;
