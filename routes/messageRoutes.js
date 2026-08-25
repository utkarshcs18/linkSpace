const express = require("express");
const {
  getAllContacts,
  getChatPartners,
  getMessagesByUserId,
  sendMessage,
} = require("../controllers/messageController.js");
const { protectRoute } = require("../middleware/authMiddleware.js");

const router = express.Router();

router.use(protectRoute);

router.get("/contacts", getAllContacts);
router.get("/chats", getChatPartners);
router.get("/:id", getMessagesByUserId);
router.post("/send/:id", sendMessage);

module.exports = router;
