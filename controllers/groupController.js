const User = require("../models/user.js");
const Group = require("../models/group.js");
const GroupMessage = require("../models/groupMessage.js");
const { getReceiverSocketId, getIO } = require("../lib/socket.js");
const { normalizeUserCode, publicUser, countWords } = require("../lib/utils.js");
const { isCipherPayload } = require("../lib/cipher.js");

const MAX_MEMBERS = 16;

function serializeGroup(group) {
  const ownerId = group.createdBy && group.createdBy._id ? group.createdBy._id : group.createdBy;
  return {
    _id: group._id,
    name: group.name,
    bio: group.bio || "",
    createdBy: String(ownerId),
    createdAt: group.createdAt,
    members: (group.members || []).map((member) =>
      member.displayName ? publicUser(member) : member
    ),
  };
}

function myCopyView(doc, userId) {
  const copy = (doc.copies || []).find(
    (item) => String(item.recipientId) === String(userId)
  );
  if (!copy) return null;
  return {
    _id: doc._id,
    groupId: doc.groupId,
    senderId: doc.senderId,
    kind: doc.kind,
    createdAt: doc.createdAt,
    ciphertext: copy.ciphertext,
    iv: copy.iv,
    ephemeralPublicKey: copy.ephemeralPublicKey,
  };
}

async function resolveCodes(codes, creatorId) {
  const unique = [
    ...new Set(
      (codes || [])
        .map((code) => normalizeUserCode(code))
        .filter((code) => code.length === 12)
    ),
  ];

  const users = unique.length ? await User.find({ userCode: { $in: unique } }) : [];
  if (users.length !== unique.length) {
    const found = new Set(users.map((user) => user.userCode));
    const missing = unique.filter((code) => !found.has(code));
    throw Object.assign(new Error(`No user found for code ${missing[0] || ""}`), {
      status: 404,
    });
  }

  const ids = [String(creatorId), ...users.map((user) => String(user._id))];
  return [...new Set(ids)];
}

const listGroups = async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user._id })
      .populate("members")
      .sort({ updatedAt: -1 });
    res.status(200).json(groups.map(serializeGroup));
  } catch (error) {
    console.log("Error in listGroups:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const createGroup = async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    if (name.length < 2) {
      return res.status(400).json({ message: "Group name must be at least 2 characters" });
    }

    const memberIds = await resolveCodes(req.body?.memberCodes, req.user._id);
    if (memberIds.length < 2) {
      return res.status(400).json({
        message: "Add at least one other person by hex code to create a group",
      });
    }
    if (memberIds.length > MAX_MEMBERS) {
      return res.status(400).json({ message: `Groups are limited to ${MAX_MEMBERS} members` });
    }

    const group = await Group.create({
      name,
      createdBy: req.user._id,
      members: memberIds,
    });
    const populated = await Group.findById(group._id).populate("members");
    res.status(201).json(serializeGroup(populated));
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    console.log("Error in createGroup:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const updateGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (String(group.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ message: "Only the group owner can edit this group" });
    }

    if (typeof req.body?.name === "string" && req.body.name.trim().length >= 2) {
      group.name = req.body.name.trim().slice(0, 40);
    }
    if (typeof req.body?.bio === "string") {
      const nextBio = req.body.bio.trim().slice(0, 3000);
      if (countWords(nextBio) > 150) {
        return res.status(400).json({ message: "Group bio must be at most 150 words" });
      }
      group.bio = nextBio;
    }

    await group.save();
    const populated = await Group.findById(group._id).populate("members");
    res.status(200).json(serializeGroup(populated));
  } catch (error) {
    console.log("Error in updateGroup:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const addMember = async (req, res) => {
  try {
    const group = await Group.findOne({ _id: req.params.id, members: req.user._id });
    if (!group) return res.status(404).json({ message: "Group not found" });

    const code = normalizeUserCode(req.body?.code);
    if (code.length !== 12) {
      return res.status(400).json({ message: "Enter a 12-character hexadecimal friend code" });
    }

    const user = await User.findOne({ userCode: code });
    if (!user) return res.status(404).json({ message: "No user found with that code" });
    if (group.members.some((id) => String(id) === String(user._id))) {
      return res.status(400).json({ message: "That user is already in the group" });
    }
    if (group.members.length >= MAX_MEMBERS) {
      return res.status(400).json({ message: `Groups are limited to ${MAX_MEMBERS} members` });
    }

    group.members.push(user._id);
    await group.save();
    const populated = await Group.findById(group._id).populate("members");
    res.status(200).json(serializeGroup(populated));
  } catch (error) {
    console.log("Error in addMember:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getGroupMessages = async (req, res) => {
  try {
    const group = await Group.findOne({ _id: req.params.id, members: req.user._id });
    if (!group) return res.status(404).json({ message: "Group not found" });

    const docs = await GroupMessage.find({ groupId: group._id }).sort({ createdAt: 1 });
    res.status(200).json(docs.map((doc) => myCopyView(doc, req.user._id)).filter(Boolean));
  } catch (error) {
    console.log("Error in getGroupMessages:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const sendGroupMessage = async (req, res) => {
  try {
    const group = await Group.findOne({ _id: req.params.id, members: req.user._id });
    if (!group) return res.status(404).json({ message: "Group not found" });

    const kind = req.body.kind === "image" ? "image" : "text";
    const copies = Array.isArray(req.body.copies) ? req.body.copies : [];
    const memberIds = group.members.map((id) => String(id));

    if (copies.length !== memberIds.length) {
      return res.status(400).json({ message: "Seal a copy for every group member" });
    }

    const seen = new Set();
    const sealed = [];
    for (const copy of copies) {
      const recipientId = String(copy.recipientId || "");
      if (!memberIds.includes(recipientId) || seen.has(recipientId) || !isCipherPayload(copy)) {
        return res.status(400).json({
          message: "Encrypted payload required for each member (ciphertext, iv, ephemeralPublicKey).",
        });
      }
      seen.add(recipientId);
      sealed.push({
        recipientId,
        ciphertext: copy.ciphertext,
        iv: copy.iv,
        ephemeralPublicKey: copy.ephemeralPublicKey,
      });
    }

    const saved = await GroupMessage.create({
      groupId: group._id,
      senderId: req.user._id,
      kind,
      copies: sealed,
    });

    const io = getIO();
    const senderId = String(req.user._id);
    if (io) {
      for (const copy of sealed) {
        if (String(copy.recipientId) === senderId) continue;
        const socketId = getReceiverSocketId(copy.recipientId);
        if (socketId) {
          io.to(socketId).emit("newGroupMessage", myCopyView(saved, copy.recipientId));
        }
      }
    }

    res.status(201).json(myCopyView(saved, req.user._id));
  } catch (error) {
    console.log("Error in sendGroupMessage:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  listGroups,
  createGroup,
  updateGroup,
  addMember,
  getGroupMessages,
  sendGroupMessage,
};
