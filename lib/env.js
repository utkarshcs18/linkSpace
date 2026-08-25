require("dotenv").config();
const crypto = require("crypto");

const NODE_ENV = process.env.NODE_ENV || "development";
let JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET && NODE_ENV !== "production") {
  JWT_SECRET = crypto.randomBytes(32).toString("hex");
  console.warn("JWT_SECRET is not set. Using a temporary development secret. Sessions reset on restart. Add JWT_SECRET to .env for persistent logins.");
}

const ENV = {
  PORT: process.env.PORT || 3000,
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET,
  NODE_ENV,
  CLIENT_URL: process.env.CLIENT_URL || `http://localhost:${process.env.PORT || 3000}`,
};

module.exports = { ENV };
