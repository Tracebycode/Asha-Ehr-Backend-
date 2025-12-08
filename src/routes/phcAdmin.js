const express = require("express");
const router = express.Router();
const { phcOnly } = require("../middleware/authMiddleware");
const phcAdminController = require("../controllers/phcAdminController");

// ASHA LIST
router.get("/ashas", phcOnly, phcAdminController.getAllAshaWorkers);

// ASHA FULL DETAILS
router.get("/ashas/:ashaId", phcOnly, phcAdminController.getAshaDetails);

// ASHA STATUS UPDATE (active/inactive)
router.put("/ashas/:ashaId/status", phcOnly, phcAdminController.updateAshaStatus);

// ANM LIST
router.get("/anms", phcOnly, phcAdminController.getAllAnmWorkers);

// ANM FULL DETAILS
router.get("/anms/:anmId", phcOnly, phcAdminController.getAnmDetails);

module.exports = router;
