const mongoose = require("mongoose");

const PlateDetectionSchema = new mongoose.Schema(
  {
    plateContent: String,
    ts: [String],
    cameraLocation: [String],
    pollID: mongoose.Types.ObjectId,
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
    driveID: mongoose.Types.ObjectId,
    speed: Number,
    power: Number,
    street: String,
    city: String,
    geocodeID: mongoose.Types.ObjectId,
    heading: String,
    status: String,
    detectionImgPath: String,
    plateID: mongoose.Types.ObjectId,
    vyear: String,
    vmake: String,
    vmodel: String,
    vehicleImgPath: String,
    secondsIntoVideo: Number,
    videoFileName: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("PlateDetection", PlateDetectionSchema);
