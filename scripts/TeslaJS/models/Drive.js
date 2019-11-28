const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const DriveSchema = new Schema({
  startTime: Date,
  startHeading: Number,
  startLocation: {
    type: {
      type: String,
      enum: ["Point"],
      required: true
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  endtime: Date,
  endHeading: Number,
  endLocation: {
    type: {
      type: String,
      enum: ["Point"],
      required: false
    },
    coordinates: {
      type: [Number],
      required: false
    }
  }
});

const DriveModel = mongoose.model("Drive", DriveSchema, "drives");

module.exports = DriveModel;
