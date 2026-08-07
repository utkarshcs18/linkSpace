const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },

    userCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      immutable: true,
      index: true,
    },

    displayName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },

    passwordHash: {
      type: String,
      required: true,
      select: false,
    },

    avatar: {
      type: String,
      default: null,
    },

    bio: {
      type: String,
      maxlength: 160,
      default: "",
    },

    status: {
      type: String,
      enum: ["online", "offline", "away", "busy"],
      default: "offline",
    },

    lastSeenAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

module.exports = User;