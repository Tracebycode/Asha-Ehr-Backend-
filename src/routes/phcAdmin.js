

const express = require("express");
const router = express.Router();

const { phcOnly } = require("../middleware/authMiddleware");
const phcAdminController = require("../controllers/phcAdminController");
const auth = require("../middleware/auth");

// ASHA LIST
router.get("/ashas", auth, phcOnly, phcAdminController.getAllAshaWorkers);

// ASHA FULL DETAILS
router.get("/ashas/:ashaId", auth, phcOnly, phcAdminController.getAshaDetails);

// ASHA STATUS UPDATE (active/inactive)
router.put(
  "/ashas/:ashaId/status",
  auth,
  phcOnly,
  phcAdminController.updateAshaStatus
);

// ANM LIST
router.get("/anms", auth, phcOnly, phcAdminController.getAllAnmWorkers);

// ANM FULL DETAILS
router.get("/anms/:anmId", auth, phcOnly, phcAdminController.getAnmDetails);

router.get(
  "/cases",
  auth,
  phcAdminController.getHealthCases
);

//health case
router.get("/cases", auth, phcAdminController.getHealthCases);



module.exports = router;
