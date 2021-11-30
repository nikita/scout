const router = require("express").Router();
const Poll = require("../../../models/Poll");

// Get Polls
router.get("/", async (req, res) => {
  res.send(
    await Poll.find({
      status: "D",
      speed: {
        $gte: 15,
        $lte: 65,
      },
    }).limit(100)
  );
});

// Get Drive Polls

// Delete Poll
router.delete("/:id", async (req, res) => {
  await Poll.deleteOne({
    _id: req.params.id,
  });
  res.status(200).send();
});

router.get("/:id", async (req, res) => {
  res.send(
    await Poll.find({
      driveID: req.params.id,
    })
  );
});

// // Get Drive Polls
// router.get("/drives", async (req, res) => {
//   const polls = await loadPollsCollection();
//   // res.send(await polls.find({}).toArray());
//   //   res.send(
//   //     await polls
//   //       .find({})
//   //       .limit(1000)
//   //       .toArray()
//   //   );

//   res.send(
//     await polls
//     .find({
//       driveID: {
//         $exists: true
//       }
//     })
//     .toArray()
//   );
// });

// Add Poll
router.post("/", async (req, res) => {
  await Poll.create({
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

// Delete Poll
router.delete("/:id", async (req, res) => {
  await Poll.deleteOne({
    _id: req.params.id,
  });
  res.status(200).send();
});

module.exports = router;
