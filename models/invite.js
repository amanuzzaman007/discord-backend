const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    server: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatServer",
    },
    inviter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

const Invite = mongoose.model("Invite", schema);
module.exports = Invite;
