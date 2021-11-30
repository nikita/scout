const fs = require("fs");
const tjs = require("teslajs");
const rp = require("request-promise");
const Drive = require("./models/Drive");
const Geocode = require("./models/Geocode");
const Poll = require("./models/Poll");

const { TESLA_EMAIL, TESLA_PASSWORD, TESLA_VEHICLE_INDEX, TESLA_URI } =
  process.env;

let options = {};
// Last car state
let lastState = "";
let lastDrive = "";
let lastGeocodeID = null;
let lastGeoTS = null;
let lastGeoStreet = null;
let lastGeoCity = null;

const login = async () => {
  // If login already saved
  try {
    const fileStr = fs.readFileSync(".token", "utf8");
    const token = JSON.parse(fileStr);
    if (token.access_token) return { authToken: token.access_token };
  } catch (err) {}

  return { authToken: "GG" };

  try {
    // Not an email
    if (!TESLA_EMAIL.includes("@")) throw new Error("Login email invalid");

    return await tjs.loginAsync({
      username: TESLA_EMAIL,
      password: TESLA_PASSWORD,
    });
  } catch (err) {
    throw new Error(`Login failed: ${err}`);
  }
};

const getVehicle = async (i = TESLA_VEHICLE_INDEX || 0) => {
  try {
    return { vehicleID: 1, vehicle_id: 1, tokens: ["GG"] };
    const vehicles = await tjs.vehiclesAsync(options);
    const vehicle = vehicles[i];

    if (vehicle.state.toUpperCase() == "OFFLINE")
      return console.log(
        "Result: " + "Unable to contact vehicle, exiting!".bold.red
      );

    const carType = tjs.getModel(vehicle);

    console.log(
      "Vehicle " +
        vehicle.vin.green +
        " - " +
        carType.green +
        " ( '" +
        vehicle.display_name.cyan +
        "' ) is: " +
        vehicle.state.toUpperCase().bold.green
    );

    return {
      vehicleID: vehicle.id_s,
      vehicle_id: vehicle.vehicle_id,
      tokens: vehicle.tokens,
    };
  } catch (err) {
    throw new Error(`Get vehicle failed: ${err}`);
  }
};

const getDriveState = async () => {
  try {
    return {
      gps_as_of: 1543187664,
      heading: 8,
      latitude: 33.111111,
      longitude: -88.111111,
      native_latitude: 33.111111,
      native_location_supported: 1,
      native_longitude: -88.111111,
      native_type: "wgs",
      power: 0,
      shift_state: null,
      speed: null,
      timestamp: 1543187666472,
    };
    return await tjs.driveStateAsync(options);
  } catch (err) {
    throw new Error(`Get drive state failed: ${err}`);
  }
};

const createDrive = async ({ latitude, longitude, gps_as_of, heading }) => {
  try {
    // Create the new Drive document
    const newDrive = new Drive({
      startTime: new Date(parseInt(gps_as_of.toString())),
      startHeading: heading.toString(),
      startLocation: {
        type: "Point",
        coordinates: [longitude.toString(), latitude.toString()],
      },
    });

    // Save the document
    await newDrive.save();

    console.log(`Saved Drive: ${newDrive._id}`);

    return newDrive;
  } catch (err) {
    console.log(err);
  }
};

const createPoll = async (
  {
    latitude,
    longitude,
    gps_as_of,
    heading,
    native_location_supported,
    native_type,
    power,
  },
  extraFields = {}
) => {
  try {
    // By default we assume we are parked, after or before a drive
    let pollData = {
      ts: new Date(parseInt(gps_as_of.toString())),
      unixTS: new Date(new Date(parseInt(gps_as_of.toString())) * 1000) / 1000,
      heading: heading.toString(),
      location: {
        type: "Point",
        coordinates: [longitude.toString(), latitude.toString()],
      },
      street: lastGeoStreet,
      city: lastGeoCity,
      locAvail: native_location_supported.toString(),
      nativeType: native_type.toString(),
      power: power.toString(),
      geocodeID: lastGeocodeID,
      ...extraFields,
    };

    // Create the new Poll document
    const newPoll = new Poll(pollData);

    // Save the document
    await newPoll.save();

    console.log(`Saved Poll: ${newPoll._id}`);

    return newPoll;
  } catch (err) {
    console.log(err);
  }
};

const createGeocode = async ({ latitude, longitude, gps_as_of }) => {
  console.log("Running createGeocode");

  try {
    const response = await rp.get({
      uri: `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude.toString()}&lon=${longitude.toString()}&zoom=18&addressdetails=1`,
      headers: {
        "User-Agent": "SDScout/0.0.1",
      },
      json: true,
    });

    // Create the new Geocode document
    const newGeocode = new Geocode({
      place_id: response.place_id,
      license: response.license,
      osm_type: response.osm_type,
      osm_id: response.osm_id,
      location: {
        type: "Point",
        coordinates: [response.lon.toString(), response.lat.toString()],
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
      boundingbox: response.boundingbox,
    });

    // Save the document
    await newGeocode.save();

    console.log(`Saved Geocode: ${newGeocode._id}`);

    // Set the last state
    lastGeoTS = parseInt(gps_as_of.toString());
    lastGeocodeID = newGeocode._id;
    lastGeoStreet = response.address.road;
    lastGeoCity = response.address.city;
  } catch (err) {
    console.log(err);
  }
};

const run = async () => {
  try {
    if (TESLA_URI) {
      console.log(`Setting portal URI to: ${TESLA_URI}`);
      tjs.setPortalBaseURI(TESLA_URI);
    }

    // Login if not set already
    if (!options.authToken) options = { ...options, ...(await login()) };

    // Get vehicle if not set already
    if (!options.vehicleID) options = { ...options, ...(await getVehicle()) };

    // Get drive state for vehicle
    const driveState = await getDriveState();
    console.log(driveState);

    const state = driveState.shift_state || "Parked";
    const speed = driveState.speed || "0";

    // Save our first Geocode if no lastGeocodeID set
    if (!lastGeocodeID) await createGeocode(driveState);

    // First poll since parked, new drive
    if (lastState === "Parked" && state != "Parked") {
      lastState = state;

      // Create the new drive
      const newDrive = await createDrive(driveState);

      // Create the new poll
      await createPoll(driveState, {
        status: state,
        speed: speed,
        driveID: newDrive._id,
      });

      lastDrive = newDrive._id;
    }
    // Just parked, last poll of the drive
    else if (lastState != "Parked" && lastState != "" && state === "Parked") {
      lastState = state;

      // Update the drive as it is now over
      await Drive.updateOne(
        {
          _id: lastDrive,
        },
        {
          endTime: new Date(parseInt(driveState.gps_as_of.toString())),
          endHeading: driveState.heading.toString(),
          endLocation: {
            type: "Point",
            coordinates: [
              driveState.longitude.toString(),
              driveState.latitude.toString(),
            ],
          },
        }
      );

      // Create the new poll
      await createPoll(driveState, {
        status: state,
        speed: speed,
        driveID: lastDrive,
      });

      lastDrive = "";
    } else {
      lastState = state;

      // Driving/in a drive
      if (state != "Parked") {
        // Check if we need to get geocode (has it been more than 3 seconds)
        if (parseInt(driveState.gps_as_of.toString()) - lastGeoTS > 3) {
          // Create the geocode
          await createGeocode(driveState);

          // Create the new poll
          await createPoll(driveState, {
            status: state,
            speed: speed,
            driveID: lastDrive,
          });
        }
        // Use lastGeo data, within 3 seconds.
        else {
          // Create the new poll
          await createPoll(driveState, {
            status: state,
            speed: speed,
            driveID: lastDrive,
          });
        }
      }
      // Parked, after or before a drive
      else {
        // Create the new poll
        await createPoll(driveState, { status: state, speed: speed });
      }
    }

    console.log(`State: ${state.green}`);
    if (speed) console.log(`Speed: ${speed.green}`);
  } catch (err) {
    console.log(err);
  }
};

module.exports = run;
