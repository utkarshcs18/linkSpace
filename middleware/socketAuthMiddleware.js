const jwt = require("jsonwebtoken");
const User = require("../models/user.js");
const { ENV } = require("../lib/env.js");
const { COOKIE_NAME } = require("../lib/utils.js");

function readCookie(cookieHeader, name) {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith(`${name}=`)) {
      return decodeURIComponent(trimmed.slice(name.length + 1));
    }
  }
  return null;
}

const socketAuthMiddleware = async (socket, next) => {
  try {
    const token =
      readCookie(socket.handshake.headers.cookie, COOKIE_NAME) ||
      socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Unauthorized - No Token Provided"));
    }

    const decoded = jwt.verify(token, ENV.JWT_SECRET);
    if (!decoded?.userId) {
      return next(new Error("Unauthorized - Invalid Token"));
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return next(new Error("User not found"));
    }

    socket.user = user;
    socket.userId = user._id.toString();
    next();
  } catch (error) {
    console.log("Error in socket authentication:", error.message);
    next(new Error("Unauthorized - Authentication failed"));
  }
};

module.exports = { socketAuthMiddleware };
