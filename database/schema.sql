-- KisanQ database schema
-- Run once against your MySQL instance:
--   mysql -u root -p < sql/schema.sql

CREATE DATABASE IF NOT EXISTS kisanq;
USE kisanq;

CREATE TABLE IF NOT EXISTS farmers (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  phone         VARCHAR(10) NOT NULL UNIQUE,
  name          VARCHAR(100) DEFAULT 'Farmer',
  language      VARCHAR(5)  DEFAULT 'en',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookings (
  id                 VARCHAR(20) PRIMARY KEY,        -- short generated id, e.g. Date.now().toString(36)
  token              INT NOT NULL,
  phone              VARCHAR(10) NOT NULL,
  farmer_name        VARCHAR(100),
  centre_name        VARCHAR(150) NOT NULL,
  centre_pincode     VARCHAR(6)  NOT NULL,
  booking_date       DATE NOT NULL,
  slot               VARCHAR(40) NOT NULL,
  crop               VARCHAR(40),
  quantity           DECIMAL(10,2),
  status             ENUM('booked','called','procured','paid','cancelled') DEFAULT 'booked',
  amount             DECIMAL(10,2) DEFAULT NULL,      -- filled in once procured, used for payment
  razorpay_order_id  VARCHAR(64)  DEFAULT NULL,
  razorpay_payment_id VARCHAR(64) DEFAULT NULL,
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_centre_date (centre_pincode, booking_date),
  INDEX idx_phone (phone),
  UNIQUE KEY uniq_token_per_centre_day (centre_pincode, booking_date, token),

  CONSTRAINT fk_booking_farmer FOREIGN KEY (phone) REFERENCES farmers(phone)
);
