const path = require("path");
const crypto = require("crypto");
const Razorpay = require("razorpay");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

async function createOrder({ amount, receipt }) {
  return razorpay.orders.create({
    amount: Math.round(Number(amount) * 100),
    currency: "INR",
    receipt
  });
}

function verifySignature({ order_id, payment_id, signature }) {
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${order_id}|${payment_id}`)
    .digest("hex");
  return expected === signature;
}

module.exports = { razorpay, createOrder, verifySignature };
