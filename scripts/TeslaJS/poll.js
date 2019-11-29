"use strict";

require("dotenv").config();
require("colors");
const cron = require("node-cron");
const rp = require("request-promise");
const program = require("commander");
const mongoose = require("mongoose");
const framework = require("./framework");

// Our mongoose models
const Drive = require("./models/Drive");
const Geocode = require("./models/Geocode");
const Poll = require("./models/Poll");

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

function sampleMain(tjs, options) {
  let lastState = "";
  let lastDrive = "";
  let lastGeocodeID = null;
  let lastGeoTS = null;
  let lastGeoStreet = null;
  let lastGeoCity = null;
  let lastGeoObject = null;

  async function createDrive({ latitude, longitude, gps_as_of, heading }) {
    try {
      // Create the new Drive document
      const newDrive = new Drive({
        startTime: new Date(parseInt(gps_as_of.toString())),
        startHeading: heading.toString(),
        startLocation: {
          type: "Point",
          coordinates: [longitude.toString(), latitude.toString()]
        }
      });

      // Save the document
      await newDrive.save();

      console.log(`Saved Drive: ${newDrive._id}`);

      return newDrive;
    } catch (err) {
      console.log(err);
    }
  }

  async function createPoll(
    {
      latitude,
      longitude,
      gps_as_of,
      heading,
      native_location_supported,
      native_type,
      power
    },
    extraFields = {}
  ) {
    try {
      // By default we assume we are parked, after or before a drive
      let pollData = {
        ts: new Date(parseInt(gps_as_of.toString())),
        unixTS:
          new Date(new Date(parseInt(gps_as_of.toString())) * 1000) / 1000,
        heading: heading.toString(),
        location: {
          type: "Point",
          coordinates: [longitude.toString(), latitude.toString()]
        },
        street: lastGeoStreet,
        city: lastGeoCity,
        locAvail: native_location_supported.toString(),
        nativeType: native_type.toString(),
        power: power.toString(),
        geocodeID: lastGeocodeID,
        ...extraFields
      };

      // Create the new Poll document
      const newPoll = new Poll(pollData);

      // Save the document
      await newPoll.save();

      console.log(`Saved Poll: ${newPoll}`);

      return newPoll;
    } catch (err) {
      console.log(err);
    }
  }

  async function createGeocode({ latitude, longitude, gps_as_of }) {
    console.log("Running createGeocode");

    try {
      const response = await rp.get({
        uri: `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude.toString()}&lon=${longitude.toString()}&zoom=18&addressdetails=1`,
        headers: {
          "User-Agent": "SDScout/0.0.1"
        },
        json: true
      });

      // Create the new Geocode document
      const newGeocode = new Geocode({
        place_id: response.place_id,
        license: response.license,
        osm_type: response.osm_type,
        osm_id: response.osm_id,
        location: {
          type: "Point",
          coordinates: [response.lon.toString(), response.lat.toString()]
        },
        display_name: response.display_name,
        house_number: response.address.house_number,
        road: response.address.road,
        suburb: response.address.suburb,
        city: response.address.city,
        county: response.address.county,
        state: response.address.state,
        postcode: response.address.postcode,
        country: response.address.country,
        country_code: response.address.country_code,
        boundingbox: response.boundingbox
      });

      // Save the document
      await newGeocode.save();

      console.log(`Saved Geocode: ${newGeocode._id}`);

      // Set the last state
      lastGeoObject = newGeocode;
      lastGeoTS = parseInt(gps_as_of.toString());
      lastGeocodeID = newGeocode._id;
      lastGeoStreet = response.address.road;
      lastGeoCity = response.address.city;
    } catch (err) {
      console.log(err);
    }
  }

  tjs.driveState(options, async function(err, drive_state) {
    if (drive_state) {
      const state = drive_state.shift_state || "Parked";
      const speed = drive_state.speed || "0";

      // Save our first Geocode if no lastGeocodeID set
      if (!lastGeocodeID) createGeocode(drive_state);

      console.log(drive_state);

      // First poll since parked, new drive
      if (lastState === "Parked" && state != "Parked") {
        lastState = state;

        // Create the new drive
        const newDrive = await createDrive(drive_state);

        // Create the new poll
        await createPoll(drive_state, {
          status: state,
          speed: speed,
          driveID: newDrive._id
        });

        lastDrive = newDrive._id;
      }
      // Just parked, last poll of the drive
      else if (lastState != "Parked" && lastState != "" && state === "Parked") {
        lastState = state;

        // Update the drive as it is now over
        await Drive.updateOne(
          {
            _id: lastDrive
          },
          {
            endTime: new Date(parseInt(drive_state.gps_as_of.toString())),
            endHeading: drive_state.heading.toString(),
            endLocation: {
              type: "Point",
              coordinates: [
                drive_state.longitude.toString(),
                drive_state.latitude.toString()
              ]
            }
          }
        );

        // Create the new poll
        await createPoll(drive_state, {
          status: state,
          speed: speed,
          driveID: lastDrive
        });

        lastDrive = "";
      } else {
        lastState = state;

        // Driving/in a drive
        if (state != "Parked") {
          // Check if we need to get geocode (has it been more than 3 seconds)
          if (parseInt(drive_state.gps_as_of.toString()) - lastGeoTS > 3) {
            // Create the geocode
            await createGeocode(drive_state);

            // Create the new poll
            await createPoll(drive_state, {
              status: state,
              speed: speed,
              driveID: lastDrive
            });
          }
          // Use lastGeo data, within 3 seconds.
          else {
            // Create the new poll
            await createPoll(drive_state, {
              status: state,
              speed: speed,
              driveID: lastDrive
            });
          }
        }
        // Parked, after or before a drive
        else {
          // Create the new poll
          await createPoll(drive_state, { status: state, speed: speed });
        }
      }

      console.log(`State: ${state.green}`);

      if (speed) {
        console.log(`Speed: ${speed.green}`);
      }
    } else {
      console.log(err.red);
    }
  });
}

const main = () => {
  program
    .option(
      "-u, --username [string]",
      "username (needed only if token not cached)"
    )
    .option(
      "-p, --password [string]",
      "password (needed only if token not cached)"
    )
    .option("-g, --geocode", "geocode the street address")
    .option("-i, --index <n>", "vehicle index (first car by default)", parseInt)
    .option(
      "-U, --uri [string]",
      "URI of test server (e.g. http://127.0.0.1:3000)"
    )
    .parse(process.argv);

  const poll = new framework(program, sampleMain);

  cron.schedule("*/1 * * * * *", function() {
    poll.run();
  });
};

main();
