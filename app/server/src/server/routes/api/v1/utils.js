const fs = require("fs");
const router = require("express").Router();

router.get("/details", (req, res) => {
  res.send(
    JSON.parse(fs.readFileSync(`${__dirname}/currentJSON.json`, "utf8"))
  );
});

router.post("/honk", (req, res) => {
  res.send({
    message: "Success!",
  });
});

router.get("/thumb/:type/:fileName", (req, res) => {
  if (req.params.type === "face") {
    var filepath = `/tesladrive/detections/faces/${req.params.fileName}`;
    console.log(`FILEPATH:${filepath}`);
    res.sendFile(filepath);
  } else if (req.params.type === "plate") {
    var filepath = `/tesladrive/detections/vehicles/${req.params.fileName}`;
    console.log(`FILEPATH:${filepath}`);
    res.sendFile(filepath);
  }
});

router.get("/image/:type/:fileName", (req, res) => {
  if (req.params.type === "face") {
    var filepath = `/tesladrive/detections/people/${req.params.fileName}`;
    console.log(`FILEPATH:${filepath}`);
    res.sendFile(filepath);
  } else if (req.params.type === "plate") {
    var filepath = `/tesladrive/detections/vehicles/${req.params.fileName}`;
    console.log(`FILEPATH:${filepath}`);
    res.sendFile(filepath);
  }
});

router.get("/video/:fileName", (re, res) => {
  var filepath = `/tesladrive/Videos/${req.params.fileName}`;
  console.log(`FILEPATH:${filepath}`);
  res.sendFile(filepath);
});

module.exports = router;
