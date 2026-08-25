const User = require("../models/user.js");
const Contact = require("../models/contact.js");
const Message = require("../models/message.js");
const { getReceiverSocketId, getIO } = require("../lib/socket.js");
const { publicUser } = require("../lib/utils.js");
const { isCipherPayload } = require("../lib/cipher.js");

const getAllContacts = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const contacts = await Contact.find({ userId: loggedInUserId }).populate(
      "contactId",
      "-passwordHash"
    );

    const people = contacts
      .map((row) => {
        if (!row.contactId) return null;
        const user = publicUser(row.contactId);
        return {
          ...user,
          savedName: row.savedName || user.displayName,
        };
      })
      .filter(Boolean);

    res.status(200).json(people);
  } catch (error) {
    console.log("Error in getAllContacts:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getMessagesByUserId = async (req, res) => {
  try {
    const myId = req.user._id;
    const { id: userToChatId } = req.params;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    }).sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    if (!isCipherPayload(req.body)) {
      return res.status(400).json({
        message: "Encrypted payload required (ciphertext, iv, ephemeralPublicKey).",
      });
    }

    if (senderId.equals(receiverId)) {
      return res.status(400).json({ message: "Cannot send messages to yourself." });
    }

    const receiverExists = await User.exists({ _id: receiverId });
    if (!receiverExists) {
      return res.status(404).json({ message: "Receiver not found." });
    }

    const kind = req.body.kind === "image" ? "image" : "text";

    const newMessage = await Message.create({
      senderId,
      receiverId,
      ciphertext: req.body.ciphertext,
      iv: req.body.iv,
      ephemeralPublicKey: req.body.ephemeralPublicKey,
      kind,
    });

    await Contact.updateOne(
      { userId: senderId, contactId: receiverId },
      { $setOnInsert: { userId: senderId, contactId: receiverId } },
      { upsert: true }
    );
    await Contact.updateOne(
      { userId: receiverId, contactId: senderId },
      { $setOnInsert: { userId: receiverId, contactId: senderId } },
      { upsert: true }
    );

    const io = getIO();
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (io && receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getChatPartners = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;

    const messages = await Message.find({
      $or: [{ senderId: loggedInUserId }, { receiverId: loggedInUserId }],
    }).select("senderId receiverId");

    const chatPartnerIds = [
      ...new Set(
        messages.map((msg) =>
          msg.senderId.toString() === loggedInUserId.toString()
            ? msg.receiverId.toString()
            : msg.senderId.toString()
        )
      ),
    ];

    const saved = await Contact.find({ userId: loggedInUserId });
    saved.forEach((row) => chatPartnerIds.push(row.contactId.toString()));

    const uniqueIds = [...new Set(chatPartnerIds)];
    const chatPartners = await User.find({ _id: { $in: uniqueIds } });

    res.status(200).json(chatPartners.map(publicUser));
  } catch (error) {
    console.error("Error in getChatPartners:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  getAllContacts,
  getMessagesByUserId,
  sendMessage,
  getChatPartners,
};
