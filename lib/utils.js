const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { ENV } = require("./env.js");

const COOKIE_NAME = "jwt";

function generateToken(userId, res) {
  const { JWT_SECRET } = ENV;
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  const token = jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: "7d",
  });

  res.cookie(COOKIE_NAME, token, {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: "strict",
    secure: ENV.NODE_ENV === "production",
    path: "/",
  });

  return token;
}

function clearAuthCookie(res) {
  res.cookie(COOKIE_NAME, "", {
    maxAge: 0,
    httpOnly: true,
    sameSite: "strict",
    secure: ENV.NODE_ENV === "production",
    path: "/",
  });
}

function generateUserCode() {
  return crypto.randomBytes(6).toString("hex").toUpperCase();
}

function normalizeUserCode(value) {
  if (!value || typeof value !== "string") return "";
  return value.replace(/[^0-9a-fA-F]/g, "").toUpperCase();
}

function formatUserCode(code) {
  const raw = normalizeUserCode(code);
  return raw.replace(/(.{4})/g, "$1-").replace(/-$/, "");
}

function isValidIdentityPublicKey(key) {
  if (!key || typeof key !== "object") return false;
  return (
    key.kty === "EC" &&
    key.crv === "P-256" &&
    typeof key.x === "string" &&
    typeof key.y === "string" &&
    !key.d
  );
}

function countWords(text) {
  if (!text || typeof text !== "string") return 0;
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function publicUser(user) {
  if (!user) return null;
  const obj = typeof user.toObject === "function" ? user.toObject() : user;
  return {
    _id: obj._id,
    email: obj.email,
    displayName: obj.displayName,
    userCode: obj.userCode,
    userCodeFormatted: formatUserCode(obj.userCode),
    avatar: obj.avatar || null,
    bio: obj.bio || "",
    status: obj.status,
    lastSeenAt: obj.lastSeenAt,
    identityPublicKey: obj.identityPublicKey || null,
    createdAt: obj.createdAt,
  };
}

module.exports = {
  COOKIE_NAME,
  generateToken,
  clearAuthCookie,
  generateUserCode,
  normalizeUserCode,
  formatUserCode,
  isValidIdentityPublicKey,
  publicUser,
  countWords,
};
