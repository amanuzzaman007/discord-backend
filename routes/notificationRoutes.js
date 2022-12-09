const express = require("express");
const { authMiddleware } = require("../middlewares/authMiddleware");
const router = express.Router();
const Notification = require("../models/notification");
const ChatServer = require("../models/chatServer");
const Channel = require("../models/channel");
const cron = require("node-cron");
const Joi = require("joi");

// create notifications
router.get("/create", authMiddleware, async (req, res) => {
  try {
    const { value, error } = validateBody(req.body);
    if (error) {
      return res.status(400).json({ message: error.message });
    }
    const { to, type, serverId, content } = value;

    const notification = await Notification.create({
      from: req.user._id,
      to,
      type,
      server: serverId,
      content,
    });
    const task = cron.schedule("* * * 7 * *", async () => {
      await Notification.findByIdAndRemove(notification._id);
      task.stop();
      console.log("task stopped");
    });
    res.status(201).json(notification);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Internal Server Error!", stack: err.message });
  }
});

// get notifications
router.get("/", authMiddleware, async (req, res) => {
  try {
    const notifications = await Notification.find({ to: req.user._id })
      .populate("from", "-password")
      .populate("server");

    res.status(200).json(notifications);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Internal Server Error!", stack: err.message });
  }
});

// joi validation
function validateBody(body) {
  const schema = Joi.object({
    to: Joi.string().required(),
    type: Joi.string().required().min(3).max(50),
    serverId: Joi.string().required(),
    content: Joi.string().required(),
  });

  return schema.validate(body);
}

module.exports = router;
