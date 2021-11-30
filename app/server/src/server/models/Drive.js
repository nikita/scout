const mongoose = require("mongoose");

const DriveSchema = new mongoose.Schema(
  {
    startTime: Date,
    startHeading: Number,
    startLocation: {
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
    endtime: Date,
    endHeading: Number,
    endLocation: {
      type: {
        type: String,
        enum: ["Point"],
        required: false,
      },
      coordinates: {
        type: [Number],
        required: false,
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Drive", DriveSchema);
