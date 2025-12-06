const express = require("express");
const router = express.Router();

const { authMiddleware } = require("../middleware/auth");
const { updateAshaEntity } = require("../controllers/ashaUpdate.controller");

// Unified update route
router.put("/asha/update", authMiddleware, updateAshaEntity);

module.exports = router;
