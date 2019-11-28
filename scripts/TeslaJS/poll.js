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
  let firstGeoCode = true;
  let lastState = "";
  let lastDrive = "";
  let lastGeocodeID = null;
  let lastGeoTS = null;
  let lastGeoStreet = null;
  let lastGeoCity = null;
  let lastGeoObject = new Geocode({});

  async function getGeoCode({
    latitude,
    longitude,
    gps_as_of,
    heading,
    native_location_supported,
    native_type,
    power
  }) {
    console.log("Running getGeoCode");

    try {
      const response = await rp.get({
        uri: `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude.toString()}&lon=${longitude.toString()}&zoom=18&addressdetails=1`,
        headers: {
          "User-Agent": "SDScout/0.0.1"
        },
        json: true
      });

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

      console.log(
        `Saved ${firstGeoCode ? "First Geocode" : "Geocode"}:\n${
          newGeocode._id
        }`
      );

      // Set the last state
      lastGeoObject = newGeocode;
      lastGeoTS = parseInt(gps_as_of.toString());
      lastGeocodeID = newGeocode._id;
      lastGeoStreet = response.address.road;
      lastGeoCity = response.address.city;

      // If not our first GeoCode we save the poll too
      if (!firstGeoCode) {
        const newPoll = new Poll({
          ts: new Date(parseInt(gps_as_of.toString())),
          unixTS:
            new Date(new Date(parseInt(gps_as_of.toString())) * 1000) / 1000,
          heading: heading.toString(),
          location: {
            type: "Point",
            coordinates: [longitude.toString(), latitude.toString()]
          },
          street: response.address.road,
          city: response.address.city,
          locAvail: native_location_supported.toString(),
          nativeType: native_type.toString(),
          power: power.toString(),
          status: state,
          speed: speed,
          driveID: lastDrive,
          geocodeID: newGeocode._id
        });

        // Save the document
        await newPoll.save();

        console.log(`Saved Poll:\n${newPoll}`);
      } else {
        firstGeoCode = false;
      }
    } catch (err) {
      console.log(err);
    }
  }

  tjs.driveState(options, async function(err, drive_state) {
    if (drive_state) {
      // Save our first Geocode
      if (!lastGeocodeID) getGeoCode(drive_state);

      console.log(drive_state);

      var state = drive_state.shift_state || "Parked";
      var speed = drive_state.speed || "0";

      if (lastState === "Parked" && state != "Parked") {
        //first poll since parked, new drive

        lastState = state;

        const newDrive = new Drive({
          startTime: new Date(parseInt(drive_state.gps_as_of.toString())),
          startHeading: drive_state.heading.toString(),
          startLocation: {
            type: "Point",
            coordinates: [
              drive_state.longitude.toString(),
              drive_state.latitude.toString()
            ]
          }
        });
        newDrive.save().then(() => {
          lastDrive = newDrive._id;

          console.log(`Saved:\n${newDrive._id}`);
          const newPoll = new Poll({
            ts: new Date(parseInt(drive_state.gps_as_of.toString())),
            unixTS:
              new Date(
                new Date(parseInt(drive_state.gps_as_of.toString())) * 1000
              ) / 1000,
            heading: drive_state.heading.toString(),
            location: {
              type: "Point",
              coordinates: [
                drive_state.longitude.toString(),
                drive_state.latitude.toString()
              ]
            },
            locAvail: drive_state.native_location_supported.toString(),
            nativeType: drive_state.native_type.toString(),
            power: drive_state.power.toString(),
            status: state,
            speed: speed,
            driveID: newDrive._id,
            geocodeID: lastGeocodeID,
            street: lastGeoStreet,
            city: lastGeoCity
          });

          newPoll.save().then(() => console.log(`Saved:\n${newPoll}`));
        });
      } else if (
        lastState != "Parked" &&
        lastState != "" &&
        state === "Parked"
      ) {
        //just parked, last poll of the drive
        lastState = state;

        Drive.updateOne(
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
          },
          err => {}
        ).then(() => {
          const newPoll = new Poll({
            ts: new Date(parseInt(drive_state.gps_as_of.toString())),
            unixTS:
              new Date(
                new Date(parseInt(drive_state.gps_as_of.toString())) * 1000
              ) / 1000,
            heading: drive_state.heading.toString(),
            location: {
              type: "Point",
              coordinates: [
                drive_state.longitude.toString(),
                drive_state.latitude.toString()
              ]
            },
            locAvail: drive_state.native_location_supported.toString(),
            nativeType: drive_state.native_type.toString(),
            power: drive_state.power.toString(),
            status: state,
            speed: speed,
            driveID: lastDrive,
            geocodeID: lastGeocodeID,
            street: lastGeoStreet,
            city: lastGeoCity
          });

          newPoll.save().then(() => {
            console.log(`Saved:\n${newPoll}`);
            lastDrive = "";
          });
        });
      } else {
        lastState = state;

        // Driving/in a drive
        if (state != "Parked") {
          // Check if we need to get geocode (has it been more than 3 seconds)
          if (parseInt(drive_state.gps_as_of.toString()) - lastGeoTS > 3) {
            getGeoCode(drive_state);
          } else {
            // Use lastGeo data, within 3 seconds.

            const newPoll = new Poll({
              ts: new Date(parseInt(drive_state.gps_as_of.toString())),
              unixTS:
                new Date(
                  new Date(parseInt(drive_state.gps_as_of.toString())) * 1000
                ) / 1000,
              heading: drive_state.heading.toString(),
              location: {
                type: "Point",
                coordinates: [
                  drive_state.longitude.toString(),
                  drive_state.latitude.toString()
                ]
              },
              street: lastGeoStreet,
              city: lastGeoCity,
              locAvail: drive_state.native_location_supported.toString(),
              nativeType: drive_state.native_type.toString(),
              power: drive_state.power.toString(),
              status: state,
              speed: speed,
              driveID: lastDrive,
              geocodeID: lastGeocodeID
            });

            newPoll.save().then(() => {
              console.log(`Saved:\n${newPoll}`);
            });
          }
        } else {
          //parked, after or before a drive
          const newPoll = new Poll({
            ts: new Date(parseInt(drive_state.gps_as_of.toString())),
            unixTS:
              new Date(
                new Date(parseInt(drive_state.gps_as_of.toString())) * 1000
              ) / 1000,
            heading: drive_state.heading.toString(),
            location: {
              type: "Point",
              coordinates: [
                drive_state.longitude.toString(),
                drive_state.latitude.toString()
              ]
            },
            street: lastGeoStreet,
            city: lastGeoCity,
            locAvail: drive_state.native_location_supported.toString(),
            nativeType: drive_state.native_type.toString(),
            power: drive_state.power.toString(),
            status: state,
            speed: speed,
            geocodeID: lastGeocodeID
          });

          newPoll.save().then(() => {
            console.log(`Saved:\n${newPoll}`);
          });
        }
      }

      console.log("\nState: " + state.green);

      if (drive_state.speed) {
        var str = drive_state.speed || 0;
        console.log("Speed: " + str.green);
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
