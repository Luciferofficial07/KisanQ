const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const { initDb } = require("./config/db");

const centresRoutes = require("./routes/centresRoutes");
const authRoutes = require("./routes/authRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();
const allowedOrigins = (process.env.CORS_ORIGIN || "").split(",").map((s) => s.trim()).filter(Boolean);

app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : "*" }));
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (req, res) => res.json({ success: true, message: "KisanQ backend is up." }));

app.use("/api/centres", centresRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);

app.use(express.static(path.join(__dirname, "..", "docs")));

app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ success: false, message: "Not found." });
  }
  next();
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: "Server error." });
});

const PORT = process.env.PORT || 5000;

initDb()
  .catch((err) => {
    console.error("Database init failed:", err.message);
    console.error("OTP still works if Twilio is configured. Start PostgreSQL for farmer save.");
  })
  .finally(() => {
    app.listen(PORT, () => console.log(`KisanQ backend running on port ${PORT}`));
  });
