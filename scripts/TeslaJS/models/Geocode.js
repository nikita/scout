const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const GeocodeSchema = new Schema({
  place_id: Number,
  license: String,
  osm_type: String,
  osm_id: Number,
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
  display_name: String,

  house_number: String,
  road: String,
  suburb: String,
  city: String,
  county: String,
  state: String,
  postcode: String,
  country: String,
  country_code: String,
  boundingbox: [String]
});

const GeocodeModel = mongoose.model("Geocode", GeocodeSchema, "geocodes");

module.exports = GeocodeModel;
