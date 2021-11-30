const mongoose = require("mongoose");

const PollSchema = new mongoose.Schema(
  {
    ts: Date,
    unixTS: Number,
    heading: Number,
    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    street: String,
    city: String,
    locAvail: Boolean,
    nativeType: String,
    power: Number,
    status: String,
    speed: Number,
    driveID: mongoose.Schema.Types.ObjectId,
    geocodeID: mongoose.Schema.Types.ObjectId,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Poll", PollSchema);
