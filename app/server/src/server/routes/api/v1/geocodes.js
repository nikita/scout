const router = require("express").Router();
const Geocode = require("../../../models/Geocode");

// Get Geocodes
router.get("/", async (req, res) => {
  res.send(
    await Geocode.find({
      status: "D",
      speed: {
        $gte: 15,
        $lte: 65,
      },
    }).limit(100)
  );
});

// Get Drive Geocodes

// Delete Geocode
router.delete("/:id", async (req, res) => {
  await Geocode.deleteOne({
    _id: req.params.id,
  });
  res.status(200).send();
});

router.get("/:id", async (req, res) => {
  res.send(
    await Geocode.find({
      _id: req.params.id,
    })
  );
});

// // Get Drive Geocodes
// router.get("/drives", async (req, res) => {
//   const geocodes = await loadGeocodesCollection();
//   // res.send(await geocodes.find({}).toArray());
//   //   res.send(
//   //     await geocodes
//   //       .find({})
//   //       .limit(1000)
//   //       .toArray()
//   //   );

//   res.send(
//     await geocodes
//     .find({
//       driveID: {
//         $exists: true
//       }
//     })
//     .toArray()
//   );
// });

// Add Geocode
router.post("/", async (req, res) => {
  await Geocode.create({
    lat: req.body.lat,
    lon: req.body.lon,
    ts: req.body.ts,
    locAvail: req.body.locAvail,
    nativeType: req.body.nativeType,
    power: req.body.power,
    heading: req.body.heading,
    speed: req.body.speed,
    status: req.body.status,
  });
  res.status(201).send();
});

// Delete Geocode
router.delete("/:id", async (req, res) => {
  await Geocode.deleteOne({
    _id: req.params.id,
  });
  res.status(200).send();
});

module.exports = router;
