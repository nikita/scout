require("dotenv").config();
require("colors");
const cron = require("node-cron");
const mongoose = require("mongoose");
const framework = require("./framework");

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Successfully connected to MongoDB!"));

const main = () => {
  // Run cron every minute
  cron.schedule("*/1 * * * *", () => {
    framework();
  });
};

main();
