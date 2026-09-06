const path = require("path");
const twilio = require("twilio");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

async function sendOtp(phone) {
  const verification = await client.verify.v2.services(verifyServiceSid).verifications.create({
    to: `+91${phone}`,
    channel: "sms"
  });
  return verification.status === "pending" || verification.status === "approved";
}

async function checkOtp(phone, otp) {
  const verificationCheck = await client.verify.v2.services(verifyServiceSid).verificationChecks.create({
    to: `+91${phone}`,
    code: otp
  });
  return verificationCheck.status === "approved";
}

async function sendSms(phone, body) {
  if (!process.env.TWILIO_PHONE_NUMBER || !body) return;
  return client.messages.create({
    to: `+91${phone}`,
    from: process.env.TWILIO_PHONE_NUMBER,
    body
  });
}

module.exports = { sendOtp, checkOtp, sendSms };
