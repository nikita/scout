const router = require("express").Router();
const { ObjectId } = require("mongoose").Types;
const Plate = require("../../../models/Plate");
const PlateDetection = require("../../../models/PlateDetection");

// Get Plates
router.get("/", async (req, res) => {
  var platesToCheckDetections = await Plate.find({});

  await platesToCheckDetections.forEach((plate) => {
    console.log(plate._id);

    plate.numDetections = (
      await PlateDetection.find({
        plateID: new ObjectId(plate._id),
      }).sort({
        ts: 1,
      })
    ).length;
  });

  res.send(platesToCheckDetections);
});

// Get Plate Detections for recent(limit to 50)
router.get("/detections", async (req, res) => {
  res.send(
    await PlateDetection.find()
      .sort({
        _id: 1,
      })
      .limit(50)
  );
});

// Get All Plate Detections
router.get("/alldetections", async (req, res) => {
  res.send(
    await PlateDetection.find().sort({
      _id: 1,
    })
  );
});

// Get Plate Detections DeDuped)
router.get("/alldetectionsdd", async (req, res) => {
  var prePlates = await PlateDetection.find().sort({
    _id: 1,
  });
  var prePlatesCount = await PlateDetection.count();
  var prePlates2 = await prePlates;
  console.log(prePlatesCount);

  var lastPlate = {};
  var lastPlate2 = {
    test: false,
  };
  var postPlates = [];
  await prePlates2.forEach((detection) => {
    // postPlates.push(detection)
    // console.log(`pDetection:${detection}`);
    console.log(`lastPlate == ${Object.keys(lastPlate).length}`);
    console.log(`lastPlate2 == ${Object.keys(lastPlate2).length}`);

    if (Object.keys(lastPlate).length > 0) {
      //check if this plateContent is the same as the last one
      if (detection.plateContent === lastPlate.plateContent) {
        //same plate, has enough time gone by?
        if (detection.ts - lastPlate.ts > 60) {
          postPlates.push(detection);
          lastPlate = detection;
          console.log(`pushing valid detection:${detection}`);
        }
      } else {
        postPlates.push(detection);
        lastPlate = detection;
        console.log(`pushing valid detection:${detection}`);
      }
    } else {
      //first time running, nothing to compare to
      lastPlate = detection;
      postPlates.push(detection);
      console.log(`pushing valid detection:${detection}`);
    }
  });
  res.send(postPlates);
});

// Get specific plate detections

router.get("/detections/:id", async (req, res) => {
  res.send(
    await PlateDetection.find({
      plateID: new ObjectId(req.params.id),
    }).sort({
      ts: 1,
    })
  );
});

// Add Plate
router.post("/", async (req, res) => {
  await Plate.create({
    text: req.body.text,
  });
  res.status(201).send();
});

// Delete Plate
router.delete("/:id", async (req, res) => {
  await Plate.deleteOne({
    _id: new ObjectId(req.params.id),
  });
  res.status(200).send();
});

module.exports = router;
