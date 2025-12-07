const express = require("express");
const router = express.Router();

const  authMiddleware = require("../middleware/auth.js");
const  update  = require("../controllers/Update.js");

// Unified update route
router.put("/update", authMiddleware, update.updateAshaEntity);
module.exports = router;
