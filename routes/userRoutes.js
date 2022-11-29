const express = require("express");
const Joi = require("joi");
const User = require("../models/user");
const { generateToken } = require("../utils");
const router = express.Router();
const { authMiddleware } = require("../middlewares/authMiddleware");

// ROUTE: api/users/login -> POST
router.post("/login", async (req, res) => {
  const { value, error } = validateLoginBody(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.message });
  }

  try {
    // if user is found or not
    const user = await User.findOne({ email: value.email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found!" });
    }

    const isPasswordMatch = await user.comparePassword(value.password);

    if (!isPasswordMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid email or password!" });
    }

    const responseData = {
      _id: user._id,
      username: user.username,
      email: user.email,
      token: generateToken(user._id, user.email),
    };

    res.status(200).json({ success: true, user: responseData });
  } catch (err) {
    console.log(err);
    res
      .status(500)
      .json({ success: false, message: "Internal Server Error", stack: err });
  }

  res.status(200).json({ success: true, user: value });
});

// ROUTE: api/users/register -> POST
router.post("/register", async (req, res) => {
  const { value, error } = validateRegisterBody(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.message });
  }

  try {
    // if user is found or not
    const user = await User.findOne({ email: req.body.email });

    if (user) {
      return res
        .status(400)
        .json({ success: false, message: "User is already registered." });
    }

    // create a new user
    const newUser = await User.create(req.body);
    const responseData = {
      _id: newUser._id,
      username: newUser.username,
      email: newUser.email,
      token: generateToken(newUser._id, newUser.email),
    };

    res.status(200).json({ success: true, user: responseData });
  } catch (err) {
    console.log(err);
    res
      .status(500)
      .json({ success: false, message: "Internal Server Error", stack: err });
  }
});

// ROUTE: api/users -> GET
router.get("/", authMiddleware, async (req, res) => {
  try {
    const keyword = req.query.search;
    const limit = +req.query.limit || 10;
    if (!keyword) {
      return res.status(200).json({
        success: true,
        users: [],
      });
    }

    const users = await User.find({
      $or: [
        {
          username: {
            $regex: keyword,
            $options: "i",
          },
        },
        {
          email: {
            $regex: keyword,
            $options: "i",
          },
        },
      ],
    })
      .find({
        _id: {
          $ne: req.user._id,
        },
      })
      .select("username email")
      .limit(limit);

    res.status(200).json({
      success: true,
      users,
    });
  } catch (err) {
    console.log(err);
    res
      .status(500)
      .json({ success: false, message: "Internal Server Error", stack: err });
  }
});

module.exports = router;

// joi validation
function validateLoginBody(body) {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  });

  return schema.validate(body);
}

function validateRegisterBody(body) {
  const schema = Joi.object({
    username: Joi.string().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string()
      .pattern(new RegExp("^[a-zA-Z0-9]{3,30}$"))
      .required(),
  });

  return schema.validate(body);
}
