const mongoose = require("mongoose");

const PlateSchema = new mongoose.Schema(
  {
    plateContent: String,
    vyear: String,
    vmake: String,
    vmodel: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Plate", PlateSchema);
