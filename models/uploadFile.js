const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    asset_id: String,
    public_id: String,
    version: Number,
    version_id: String,
    signature: String,
    width: Number,
    height: Number,
    format: String,
    resource_type: String,
    created_at: Date,
    tags: [],
    bytes: Number,
    type: String,
    etag: String,
    placeholder: Boolean,
    url: String,
    secure_url: String,
    folder: String,
    original_filename: String,
  },
  {
    timestamps: true,
  }
);

const UploadFile = mongoose.model("UploadFile", schema);
module.exports = UploadFile;
