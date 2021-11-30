const router = require("express").Router();
const Drive = require("../../../models/Drive");

// Get Drives
router.get("/", async (req, res) => {
  res.send(
    await Drive.find({
      startTime: {
        $exists: true,
      },
    })
  );
});

module.exports = router;
