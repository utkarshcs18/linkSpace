const express = require("express");
const {
  listGroups,
  createGroup,
  updateGroup,
  addMember,
  getGroupMessages,
  sendGroupMessage,
} = require("../controllers/groupController.js");
const { protectRoute } = require("../middleware/authMiddleware.js");

const router = express.Router();

router.use(protectRoute);

router.get("/", listGroups);
router.post("/", createGroup);
router.patch("/:id", updateGroup);
router.post("/:id/members", addMember);
router.get("/:id/messages", getGroupMessages);
router.post("/:id/messages", sendGroupMessage);

module.exports = router;
