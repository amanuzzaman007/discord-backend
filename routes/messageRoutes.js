const express = require("express");
const { authMiddleware } = require("../middlewares/authMiddleware");
const router = express.Router();
const Message = require("../models/message");
const { getLinkPreview } = require("link-preview-js");

// api/messages
router.get("/:channelId", authMiddleware, async (req, res) => {
  try {
    console.log({ channelId: req.params.channelId });
    const messages = await Message.aggregate([
      {
        $match: { channelId: req.params.channelId },
      },
      {
        $lookup: {
          from: "users",
          localField: "sender",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $project: {
          content: 1,
          isRawHtml: 1,
          createdAt: 1,
          user: {
            _id: 1,
            username: 1,
            active: 1,
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
            },
          },
          messageByDate: {
            $push: "$$ROOT",
          },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ]);

    res.status(200).json(messages);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal Server Error", stack: err });
  }
});

// generate links
router.post("/generate-link", async (req, res) => {
  try {
    const { link } = req.body;
    if (!link) {
      return res.status(404).json({ message: "Link is not found!" });
    }
    const data = await getLinkPreview(link);
    res.status(200).json(data);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
