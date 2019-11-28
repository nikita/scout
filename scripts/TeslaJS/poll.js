"use strict";

require("dotenv").config();
require("colors");
const cron = require("node-cron");
const request = require("request");
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

var lastState = "";
var lastDrive = "";
var lastGeocodeID = null;
var lastGeoTS = null;
var lastGeoStreet = null;
var lastGeoCity = null;
var lastGeoObject = new Geocode({});

function sampleMain(tjs, options) {
  function getFirstGeoCode(lat, lon, geoTS) {
    console.log("running getfirstgeocode");

    // Get geocode
    var headers = {
      "User-Agent": "SDScout/0.0.1"
    };
    request(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
      {
        json: true,
        headers: headers
      },
      (err, res, body) => {
        if (err) {
          return console.log(err);
        }
        const newGeocode = new Geocode({
          place_id: body.place_id,
          license: body.license,
          osm_type: body.osm_type,
          osm_id: body.osm_id,
          location: {
            type: "Point",
            coordinates: [body.lon.toString(), body.lat.toString()]
          },
          display_name: body.display_name,
          house_number: body.address.house_number,
          road: body.address.road,
          suburb: body.address.suburb,
          city: body.address.city,
          county: body.address.county,
          state: body.address.state,
          postcode: body.address.postcode,
          country: body.address.country,
          country_code: body.address.country_code,
          boundingbox: body.boundingbox
        });

        newGeocode.save().then(() => {
          lastGeoObject = newGeocode;
          lastGeoTS = geoTS;
          lastGeocodeID = newGeocode._id;
          lastGeoStreet = body.address.road;
          lastGeoCity = body.address.city;

          console.log(`Saved First Geocode:\n${newGeocode._id}`);
        });
      }
    );

    return;
  }

  tjs.driveState(options, function(err, drive_state) {
    if (drive_state) {
      if (!lastGeocodeID)
        getFirstGeoCode(
          drive_state.latitude.toString(),
          drive_state.longitude.toString(),
          parseInt(drive_state.gps_as_of.toString())
        );

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

        if (state != "Parked") {
          //driving, in a drive

          //check if we need to get geocode (has it been more than 3 seconds)
          if (parseInt(drive_state.gps_as_of.toString()) - lastGeoTS > 3) {
            // Get geocode
            var headers = {
              "User-Agent": "SDScout/0.0.1"
            };
            request(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${drive_state.latitude.toString()}&lon=${drive_state.longitude.toString()}&zoom=18&addressdetails=1`,
              {
                json: true,
                headers: headers
              },
              (err, res, body) => {
                if (err) {
                  return console.log(err);
                }
                const newGeocode = new Geocode({
                  place_id: body.place_id,
                  license: body.license,
                  osm_type: body.osm_type,
                  osm_id: body.osm_id,
                  location: {
                    type: "Point",
                    coordinates: [body.lon, body.lat]
                  },
                  display_name: body.display_name,
                  house_number: body.address.house_number,
                  road: body.address.road,
                  suburb: body.address.suburb,
                  city: body.address.city,
                  county: body.address.county,
                  state: body.address.state,
                  postcode: body.address.postcode,
                  country: body.address.country,
                  country_code: body.address.country_code,
                  boundingbox: body.boundingbox
                });

                newGeocode.save().then(() => {
                  lastGeoObject = newGeocode;
                  lastGeoTS = parseInt(drive_state.gps_as_of.toString());
                  lastGeocodeID = newGeocode._id;
                  lastGeoStreet = body.address.road;
                  lastGeoCity = body.address.city;

                  console.log(`Saved:\n${newGeocode._id}`);

                  const newPoll = new Poll({
                    ts: new Date(parseInt(drive_state.gps_as_of.toString())),
                    unixTS:
                      new Date(
                        new Date(parseInt(drive_state.gps_as_of.toString())) *
                          1000
                      ) / 1000,
                    heading: drive_state.heading.toString(),
                    location: {
                      type: "Point",
                      coordinates: [
                        drive_state.longitude.toString(),
                        drive_state.latitude.toString()
                      ]
                    },
                    street: body.address.road,
                    city: body.address.city,
                    locAvail: drive_state.native_location_supported.toString(),
                    nativeType: drive_state.native_type.toString(),
                    power: drive_state.power.toString(),
                    status: state,
                    speed: speed,
                    driveID: lastDrive,
                    geocodeID: newGeocode._id
                  });

                  newPoll.save().then(() => {
                    console.log(`Saved:\n${newPoll}`);
                  });
                });
              }
            );
          } else {
            //use lastGeo data, within 3 seconds.

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
