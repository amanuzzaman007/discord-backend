const jwt = require("jsonwebtoken");

const generateToken = (_id, email) => {
  return jwt.sign({ _id, email }, process.env.JWT_SECRET);
};

module.exports = {
  generateToken,
};
