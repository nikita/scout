const fs = require("fs");
const fsp = require("fs").promises;
const router = require("express").Router();
const Face = require("../../../models/Face");
const FaceDetection = require("../../../models/FaceDetection");

async function ensureDir(dirpath) {
  try {
    await fsp.mkdir(dirpath, {
      recursive: true,
    });
  } catch (err) {
    if (err.code !== "EEXIST") throw err;
  }
}

async function mkdir(path) {
  try {
    await ensureDir(path);
    console.log(`${path} directory created`);
  } catch (err) {
    console.error(err);
  }
}

// Get Faces
router.get("/", async (req, res) => {
  res.send(await Face.find({}));
});

// Get Face Detections
router.get("/detections", async (req, res) => {
  res.send(await FaceDetection.find({}));
});

// Add Face
router.post("/", async (req, res) => {
  await Face.insertOne({
    text: req.body.text,
    createdAt: new Date(),
  });
  res.status(201).send();
});

// Name Face
router.post("/:id", async (req, res) => {
  if (req.body.makeStranger) {
    //create a new face
    var personName = `Stranger #${(await Face.count()) + 1}`;

    const face = await Face.create({
      personName: personName,
      notNamed: true,
    });

    console.log(`new face added with id:${face._id}`);
    //now change the personName, notNamed and faceID of the detection

    const faceD = await FaceDetection.findOneAndUpdate(
      {
        _id: req.params.id,
      },
      {
        $set: {
          personName: personName,
          notNamed: true,
          faceID: face._id,
        },
      },
      {
        new: true,
      }
    );

    console.log(`just updated the detection as well:${faceD}`);
    //also gonna have to move the image in python too.
    var newFacePath = `/tesladrive/datasets/scout/train/${face._id}`;
    var oldFacePath = `/tesladrive/datasets/scout/train/${req.body.oldFaceID}`;

    await mkdir(newFacePath);
    var oldFacePathImg = `${oldFacePath}/${req.params.id}.png`;
    var newFacePathImg = `${newFacePath}/${req.params.id}.png`;

    //move the image
    await fsp.rename(oldFacePathImg, newFacePathImg);
    console.log("Successfully renamed - AKA moved!");
    console.log(`from:${oldFacePathImg}`);
    console.log(`to:${newFacePathImg}`);
    //dont need to delete the directory  becase we know based on how the ui is set up that there is at least one more image for this face

    res.status(201).send();

    //assign this detection with that faceID

    //give this detection a new stranger name

    //change this detection to hasName false
  } else if (req.body.updateDetection) {
    const faceD = await FaceDetection.findOneAndUpdate(
      {
        _id: req.params.id,
      },
      {
        $set: {
          personName: req.body.newName,
          notNamed: false,
          faceID: req.body.newFaceID,
        },
      },
      {
        new: true,
      }
    );
    //now have to move an image around
    console.log(`just updated the detection:${faceD}`);

    var numDetectionsWithOldFace = await FaceDetection.find({
      faceID: req.body.oldFaceID,
    }).count();
    if (numDetectionsWithOldFace > 0) {
      console.log(
        `have to keep the face around, there are ${numDetectionsWithOldFace} assigned to it`
      );
    } else {
      console.log(`we can delete the face, no other detections assigned to is`);
      await Face.deleteOne({
        _id: req.body.oldFaceID,
      });
      //also gonna have to delete the training folder now
    }

    res.status(201).send();
  } else {
    await Face.findOneAndUpdate(
      {
        _id: req.params.id,
      },
      {
        $set: {
          personName: req.body.name,
          notNamed: false,
        },
      },
      {
        new: true,
      }
    );
    await FaceDetection.updateMany(
      {
        faceID: req.params.id,
      },
      {
        $set: {
          personName: req.body.name,
          notNamed: false,
        },
      }
    );
    res.status(201).send();
  }
});

// Delete Face
router.delete("/:id", async (req, res) => {
  await Face.deleteOne({
    _id: req.params.id,
  });
  res.status(200).send();
});

module.exports = router;
