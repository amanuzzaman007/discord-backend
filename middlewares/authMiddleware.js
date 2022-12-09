const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const User = require("../models/user");

const authMiddleware = asyncHandler(async (req, res, next) => {
  const authorization = req.headers.authorization;
  if (authorization && authorization.startsWith("Bearer")) {
    const token = authorization.split(" ")[1];
    if (token && token !== "undefined") {
      const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
      if (decodedToken) {
        const user = await User.findById({ _id: decodedToken._id }).select(
          "-password"
        );
        if (user) {
          req.user = user;
          next();
        } else {
          res.status(401).json({ message: "Not Authorized" });
        }
      } else {
        res.status(401).json({ message: "Not Authorized" });
      }
    } else {
      res.status(401).json({ message: "Not Authorized" });
    }
  } else {
    res.status(401).json({ message: "Not Authorized" });
  }
});

module.exports = {
  authMiddleware,
};
