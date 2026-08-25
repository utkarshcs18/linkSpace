const express = require("express");
const { signup, login, logout, updateProfile, checkAuth } = require("../controllers/authController.js");
const { protectRoute } = require("../middleware/authMiddleware.js");
const { authLimiter } = require("../middleware/rateLimit.js");

const router = express.Router();

router.post("/signup", authLimiter, signup);
router.post("/login", authLimiter, login);
router.post("/logout", logout);

router.put("/update-profile", protectRoute, updateProfile);
router.get("/check", protectRoute, checkAuth);

module.exports = router;
