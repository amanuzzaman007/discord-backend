const express = require("express");
const { authMiddleware } = require("../middlewares/authMiddleware");
const router = express.Router();
const ChatServer = require("../models/chatServer");
const UploadFile = require("../models/uploadFile");
const Category = require("../models/category");
const Channel = require("../models/channel");

const Joi = require("joi");
const { cloudinary } = require("../utils");

// create server
router.post("/create-server", authMiddleware, async (req, res) => {
  try {
    const { value, error } = validateBody(req.body);
    if (error) {
      return res.status(400).json({ message: error.message });
    }
    const payload = {
      name: value.name,
      creator: req.user._id,
      users: [req.user._id],
    };
    if (req.files && !req.files.image.length) {
      const file = req.files.image;
      const result = await cloudinary.uploader.upload(file?.tempFilePath, {
        folder: "server-images",
        overwrite: true,
      });
      const uploadedData = await UploadFile.create(result);
      payload.image = uploadedData._id;
      /*
      {
          asset_id: 'b375c18ab850e798f86f667defdc7396',
          public_id: 'server-images/oevd4fkw2sh9m362u32s',
          version: 1669824241,
          version_id: 'c0e5e67965e7ad41a97dd8140a9feba2',
          signature: 'e862f5e265fd2d8c9275e1639bc72da95ca16538',
          width: 1500,
          height: 1500,
          format: 'jpg',
          resource_type: 'image',
          created_at: '2022-11-30T16:04:01Z',
          tags: [],
          bytes: 368653,
          type: 'upload',
          etag: 'b5e5bb113aea678e732af4b4449d0696',
          placeholder: false,
          url: 'http://res.cloudinary.com/dxfd8zued/image/upload/v1669824241/server-images/oevd4fkw2sh9m362u32s.jpg',
          secure_url: 'https://res.cloudinary.com/dxfd8zued/image/upload/v1669824241/server-images/oevd4fkw2sh9m362u32s.jpg',
          folder: 'server-images',
          original_filename: 'tmp-1-1669824234619',
      */
    }
    const doc = await ChatServer.create(payload);
    await Channel.create({
      channelName: "general",
      users: [req.user._id],
      isGroupChat: true,
      creator: req.user._id,
      server: doc._id,
      isGeneral: true,
    });
    res.status(200).json({
      message: "Server created successfully!",
      data: doc,
    });
  } catch (err) {
    console.log(err);
    res
      .status(500)
      .json({ message: "Internal Server Error", stack: err.message });
  }
});

// create a category
router.post("/create-category", authMiddleware, async (req, res) => {
  try {
    const { value, error } = validateCategoryBody(req.body);
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    // find server
    const server = await ChatServer.findById({ _id: value.serverId });
    if (!server) {
      return res
        .status(404)
        .json({ message: "Server is not found with the given ID" });
    }
    const payload = {
      name: value.name,
      server: value.serverId,
      creator: req.user._id,
    };
    const result = await Category.create(payload);
    res.status(200).json({
      message: "Category created successfully!",
      data: result,
    });
  } catch (err) {
    console.log(err);
    res
      .status(500)
      .json({ message: "Internal Server Error", stack: err.message });
  }
});

// joi validation
function validateBody(body) {
  const schema = Joi.object({
    name: Joi.string().required().min(3),
  });

  return schema.validate(body);
}

// get servers
router.get("/", authMiddleware, async (req, res) => {
  try {
    const serverList = await ChatServer.find({
      users: {
        $eq: req.user._id,
      },
    })
      .populate("creator", "-password")
      .populate("users", "-password")
      .populate("image", "public_id url");

    res.status(200).json(serverList);
  } catch (err) {
    console.log(err);
    res
      .status(500)
      .json({ message: "Internal Server Error", stack: err.message });
  }
});

// get servers
router.get("/category-list/:serverId", authMiddleware, async (req, res) => {
  try {
    // find server
    const server = await ChatServer.findById({ _id: req.params.serverId });
    if (!server) {
      return res
        .status(404)
        .json({ message: "Server is not found with the given ID" });
    }
    const categoryList = await Category.find({
      server: {
        $eq: req.params.serverId,
      },
    })
      .populate("creator", "-password")
      .populate("channels");

    res.status(200).json(categoryList);
  } catch (err) {
    console.log(err);
    res
      .status(500)
      .json({ message: "Internal Server Error", stack: err.message });
  }
});

// delete server
router.delete("/delete/:serverId", authMiddleware, async (req, res) => {
  try {
    const server = await ChatServer.findOneAndDelete({
      _id: req.params.serverId,
      creator: { $eq: req.user._id },
    });
    if (!server) {
      return res.status(404).json({
        message: "server not found or you may not have permission to delete",
        server,
      });
    }

    // delete server related catergories and channels
    await Category.deleteMany({ server: server._id });
    await Channel.deleteMany({ server: server._id });

    res.status(200).json({ message: "Server delete successfully" });
  } catch (err) {
    console.log(err);
    res
      .status(500)
      .json({ message: "Internal Server Error", stack: err.message });
  }
});

// get server by id
router.get("/:serverId", authMiddleware, async (req, res) => {
  try {
    const server = await ChatServer.findById({
      _id: req.params.serverId,
    })
      .populate("creator", "-password")
      .populate("users", "-password")
      .populate("image", "public_id url");
    if (!server) {
      return res.status(404).json({
        message: "server not found",
        server,
      });
    }

    res.status(200).json(server);
  } catch (err) {
    console.log(err);
    res
      .status(500)
      .json({ message: "Internal Server Error", stack: err.message });
  }
});

// remove from server and channels
router.put("/leave/:serverId", authMiddleware, async (req, res) => {
  try {
    const server = await ChatServer.find({
      _id: req.params.serverId,
    }).find({
      users: {
        $eq: req.user._id,
      },
    });
    if (!server || server.length == 0) {
      return res.status(404).json({ message: "Server is not found." });
    }
    // add user id  created with this server id
    const result = await ChatServer.findByIdAndUpdate(
      req.params.serverId,
      {
        $pull: {
          users: req.user._id,
        },
      },
      {
        new: true,
      }
    );

    // add user id all chnannels created with this server id
    await Channel.updateMany(
      { server: req.params?.serverId },
      {
        $pull: {
          users: req.user._id,
        },
      }
    );

    res
      .status(200)
      .json({ message: "User has been removed to this group", result });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Internal Server Error!", stack: err.message });
  }
});

function validateCategoryBody(body) {
  const schema = Joi.object({
    name: Joi.string().required().min(3),
    serverId: Joi.string().required(),
  });

  return schema.validate(body);
}
module.exports = router;
