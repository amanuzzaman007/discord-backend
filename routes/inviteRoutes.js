const express = require("express");
const { authMiddleware } = require("../middlewares/authMiddleware");
const router = express.Router();
const Invite = require("../models/invite");
const ChatServer = require("../models/chatServer");
const Channel = require("../models/channel");
const cron = require("node-cron");
const Joi = require("joi");

// create invite link
router.get("/create/:serverId", authMiddleware, async (req, res) => {
  try {
    const server = await ChatServer.findById({ _id: req.params.serverId });
    if (!server) {
      return res.status(404).json({ message: "Server is not found!" });
    }

    const link = await Invite.create({
      server: req.params.serverId,
      inviter: req.user._id,
    });
    const task = cron.schedule("* * * 7 * *", async () => {
      console.log("task started");
      await Invite.findByIdAndRemove(link._id);
      console.log("Link removed", link._id);
      task.stop();
      console.log("task stopped");
    });
    res.status(201).json({ linkId: link._id });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Internal Server Error!", stack: err.message });
  }
});

// get server invite
router.get("/:inviteId", authMiddleware, async (req, res) => {
  try {
    const invitation = await Invite.findById({ _id: req.params.inviteId })
      .populate("server")
      .populate("inviter", "-password");
    res.status(200).json(invitation);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Internal Server Error!", stack: err.message });
  }
});

// accept invite action
router.post("/accept", authMiddleware, async (req, res) => {
  try {
    const { value, error } = validateLoginBody(req.body);
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    const server = await ChatServer.find({
      _id: value.serverId,
    }).find({
      users: {
        $ne: req.user._id,
      },
    });
    if (!server || server.length == 0) {
      return res.status(404).json({ message: "Server is not found." });
    }
    // add user id  created with this server id
    const result = await ChatServer.findByIdAndUpdate(
      value?.serverId,
      {
        $push: {
          users: req.user._id,
        },
      },
      {
        new: true,
      }
    );

    // add user id all chnannels created with this server id
    await Channel.updateMany(
      { server: value?.serverId },
      {
        $push: {
          users: req.user._id,
        },
      }
    );

    res
      .status(200)
      .json({ message: "User has been added to this group", result });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Internal Server Error!", stack: err.message });
  }
});

// joi validation
function validateLoginBody(body) {
  const schema = Joi.object({
    serverId: Joi.string().required(),
  });

  return schema.validate(body);
}

module.exports = router;
