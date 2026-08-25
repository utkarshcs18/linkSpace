const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    savedName: {
      type: String,
      trim: true,
      maxlength: 50,
      default: "",
    },
  },
  { timestamps: true }
);

contactSchema.index({ userId: 1, contactId: 1 }, { unique: true });

const Contact = mongoose.model("Contact", contactSchema);

module.exports = Contact;
