const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const PollSchema = new Schema({
  ts: Date,
  heading: Number,
  location: {
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
  street: String,
  city: String,
  locAvail: Boolean,
  unixTS: Number,
  nativeType: String,
  power: Number,
  status: String,
  speed: Number,
  driveID: mongoose.Schema.Types.ObjectId,
  geocodeID: mongoose.Schema.Types.ObjectId
});

const PollModel = mongoose.model("Poll", PollSchema, "polls");

module.exports = PollModel;
