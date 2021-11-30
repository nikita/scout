const router = require("express").Router();

// Routes
require("./utils");
router.use("/plates", require("./plates"));
router.use("/faces", require("./faces"));
router.use("/drives", require("./drives"));
router.use("/polls", require("./polls"));
router.use("/geocodes", require("./geocodes"));

module.exports = router;
