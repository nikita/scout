const mongoose = require("mongoose");

const FaceDetectionSchema = new mongoose.Schema(
  {
    ts: Number,
    notNamed: Boolean,
    personName: String,
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
    speed: Number,
    power: Number,
    heading: Number,
    status: String,
    detectionImgPath: String,
    faceID: mongoose.Types.ObjectId,
    personImgPath: String,
    secondsIntoVideo: Number,
    videoFileName: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("FaceDetection", FaceDetectionSchema);
