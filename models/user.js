const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const schema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      min: 3,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    active: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

schema.pre("save", async function (next) {
  console.log(this.isModified("password"));
  // only hash the password if it has been modified (or is new)
  if (!this.isModified("password")) return next();

  try {
    // generate a salt
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(this.password, salt);
    this.password = hashed;
    next();
  } catch (err) {
    next(err);
  }
});

schema.methods.comparePassword = function (passwordToCompare) {
  return bcrypt.compare(passwordToCompare, this.password);
};

const User = mongoose.model("User", schema);
module.exports = User;
