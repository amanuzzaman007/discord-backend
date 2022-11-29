const express = require("express");
const { authMiddleware } = require("../middlewares/authMiddleware");
const router = express.Router();
const Channel = require("../models/channel");
const User = require("../models/user");

// api/channel/create-direct-message
router.post("/create-direct-message", authMiddleware, async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: "User id is not given",
    });
  }
  try {
    let isChat = await Channel.find({
      isGroupChat: false,
      $and: [
        {
          users: {
            $elemMatch: {
              $eq: req.user._id,
            },
          },
        },
        {
          users: {
            $elemMatch: {
              $eq: {
                _id: userId,
              },
            },
          },
        },
      ],
    })
      .populate("users", "-password")
      .populate("latestMessage")
      .populate("creator", "-password");

    isChat = await User.populate(isChat, {
      path: "latestMessage.sender",
      select: "username isActive",
    });

    if (isChat.length > 0) {
      res.status(200).send(isChat[0]);
    } else {
      let chatData = {
        channelName: "sender",
        creator: req.user._id,
        isGroupChat: false,
        users: [req.user._id, userId],
      };

      const createdChat = await Channel.create(chatData);

      const fullChat = await Channel.find({ _id: createdChat._id })
        .populate("users", "-password")
        .populate("creator", "-password");

      res.status(200).send(fullChat[0]);
    }
  } catch (err) {
    console.log(err);
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
});

// api/channel/direct-messages
router.get("/direct-messages", authMiddleware, async (req, res) => {
  try {
    const chatList = await Channel.find({
      isGroupChat: false,
      users: {
        $elemMatch: {
          $eq: req.user._id,
        },
      },
    })
      .populate("users")
      .populate("creator")
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      data: chatList,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
});

module.exports = router;
