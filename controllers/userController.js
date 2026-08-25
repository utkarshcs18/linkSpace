const User = require("../models/user.js");
const Contact = require("../models/contact.js");
const { normalizeUserCode, publicUser } = require("../lib/utils.js");

const searchByCode = async (req, res) => {
  try {
    const code = normalizeUserCode(req.query.code);
    if (code.length !== 12) {
      return res.status(400).json({ message: "Enter a 12-character hexadecimal friend code" });
    }

    const found = await User.findOne({ userCode: code });
    if (!found) {
      return res.status(404).json({ message: "No user found with that code" });
    }

    if (found._id.equals(req.user._id)) {
      return res.status(400).json({ message: "That is your own code" });
    }

    res.status(200).json(publicUser(found));
  } catch (error) {
    console.log("Error in searchByCode:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const addContact = async (req, res) => {
  try {
    const { userId, savedName } = req.body;
    if (!userId) return res.status(400).json({ message: "userId is required" });
    if (String(userId) === String(req.user._id)) {
      return res.status(400).json({ message: "Cannot add yourself" });
    }

    const other = await User.findById(userId);
    if (!other) return res.status(404).json({ message: "User not found" });

    const contact = await Contact.findOneAndUpdate(
      { userId: req.user._id, contactId: other._id },
      {
        userId: req.user._id,
        contactId: other._id,
        savedName: typeof savedName === "string" ? savedName.trim().slice(0, 50) : other.displayName,
      },
      { upsert: true, new: true }
    );

    res.status(200).json({
      ...publicUser(other),
      savedName: contact.savedName,
    });
  } catch (error) {
    console.log("Error in addContact:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { searchByCode, addContact };
