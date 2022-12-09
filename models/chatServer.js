const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      min: 3,
    },
    image: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UploadFile",
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    users: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  }
);

const ChatServer = mongoose.model("ChatServer", schema);
module.exports = ChatServer;
