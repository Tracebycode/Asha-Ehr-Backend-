const express = require("express");
const router = express.Router();
const healthController = require("../controllers/healthController");
const auth = require("../middleware/auth");

router.post("/add", auth, healthController.addHealthRecord);

module.exports = router;
