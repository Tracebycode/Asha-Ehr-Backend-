const express = require("express");
const router = express.Router();
const sync = require("../controllers/syncfamiliescontroller");
const auth = require("../middleware/auth");

router.post("/families/push", auth, sync.pushFamilies);
router.get("/families/pull", auth, sync.pullFamilies);

module.exports = router;
