const express = require("express");
const { searchByCode, addContact } = require("../controllers/userController.js");
const { protectRoute } = require("../middleware/authMiddleware.js");
const { searchLimiter } = require("../middleware/rateLimit.js");

const router = express.Router();

router.use(protectRoute);

router.get("/search", searchLimiter, searchByCode);
router.post("/contacts", addContact);

module.exports = router;
