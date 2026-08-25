const jwt = require("jsonwebtoken");
const User = require("../models/user.js");
const { ENV } = require("../lib/env.js");
const { COOKIE_NAME, publicUser } = require("../lib/utils.js");

const protectRoute = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    const bearer = header && header.startsWith("Bearer ") ? header.slice(7) : null;
    const token = req.cookies?.[COOKIE_NAME] || bearer;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized - No token provided" });
    }

    const decoded = jwt.verify(token, ENV.JWT_SECRET);
    if (!decoded?.userId) {
      return res.status(401).json({ message: "Unauthorized - Invalid token" });
    }

    const user = await User.findById(decoded.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    req.user = user;
    req.authUser = publicUser(user);
    next();
  } catch (error) {
    console.log("Error in protectRoute middleware:", error.message);
    return res.status(401).json({ message: "Unauthorized - Authentication failed" });
  }
};

module.exports = { protectRoute };
