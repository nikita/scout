const mongoose = require("mongoose");

const FaceSchema = new mongoose.Schema(
  {
    personName: String,
    notNamed: Boolean,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Face", FaceSchema);
