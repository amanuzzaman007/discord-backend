const jwt = require("jsonwebtoken");
const cloudinary = require("cloudinary").v2;

const generateToken = (_id, email) => {
  return jwt.sign({ _id, email }, process.env.JWT_SECRET);
};

cloudinary.config({
  cloud_name: "dxfd8zued",
  api_key: "713294635155344",
  api_secret: "EFsUA9q54r9brNSWis5BWX-lSBw",
  secure: true,
});

module.exports = {
  generateToken,
  cloudinary,
};
