const express = require("express");
const { authMiddleware } = require("../middlewares/authMiddleware");
const router = express.Router();
const Joi = require("joi");
const Channel = require("../models/channel");
const User = require("../models/user");
const ChatServer = require("../models/chatServer");

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

// create server channel (group channel)
router.post("/create-server-message", authMiddleware, async (req, res) => {
  try {
    const { value, error } = validateBody(req.body);
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    const server = await ChatServer.findById({ _id: value.serverId });
    if (!server) {
      return res.status(400).json({ message: "Server is not found!" });
    }

    const groupChannel = await Channel.create({
      channelName: value.name,
      users: [...server.users],
      isGroupChat: true,
      creator: req.user._id,
      server: value.serverId,
      category: value.categoryId,
    });

    const fullGroupChat = await Channel.findOne({
      _id: groupChannel._id,
    }).populate("creator", "-password");

    res.status(201).json(fullGroupChat);
  } catch (err) {
    console.log(err);
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
});

// $and: [
//   {
//     users: {
//       $elemMatch: {
//         $eq: req.user._id,
//       },
//     },
//   },
//   {
//     users: {
//       $elemMatch: {
//         $eq: {
//           _id: userId,
//         },
//       },
//     },
//   },
// ],

// api/channel/server-channels/serverId (when category false)
router.get("/server-channels/:serverId", authMiddleware, async (req, res) => {
  try {
    const chatList = await Channel.find({
      isGroupChat: true,
      $and: [
        {
          server: {
            $eq: req.params.serverId,
          },
        },
        {
          users: {
            $elemMatch: {
              $eq: req.user._id,
            },
          },
        },
        {
          category: {
            $exists: false,
          },
        },
      ],
    })
      .populate("users", "-password")
      .populate("creator", "-password")
      .sort({ updatedAt: 1 });

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

// api/channel/server-channels/serverId (when category true)
router.get(
  "/category-channels/:serverId/:categoryId",
  authMiddleware,
  async (req, res) => {
    try {
      const chatList = await Channel.find({
        isGroupChat: true,
        $and: [
          {
            server: {
              $eq: req.params.serverId,
            },
          },
          {
            users: {
              $elemMatch: {
                $eq: req.user._id,
              },
            },
          },
          {
            category: {
              $eq: req.params.categoryId,
            },
          },
        ],
      })
        .populate("users", "-password")
        .populate("creator", "-password")
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
  }
);

// delete channel
router.delete("/delete/:channelId", authMiddleware, async (req, res) => {
  try {
    const channel = await Channel.findOneAndDelete({
      _id: req.params.channelId,
      isGeneral: false,
      creator: {
        $eq: req.user._id,
      },
    });

    res.status(200).json({ message: "Channel delete successfully", channel });
  } catch (err) {
    res.status(500).json({
      message: "Internal Server Error",
      stack: err.message,
    });
  }
});

// joi validation
function validateBody(body) {
  const schema = Joi.object({
    name: Joi.string().required().min(3),
    serverId: Joi.string().required(),
    categoryId: Joi.string(),
  });

  return schema.validate(body);
}

module.exports = router;
