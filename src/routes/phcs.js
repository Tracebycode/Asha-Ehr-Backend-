
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth.js");




const phcsareaController  = require("../controllers/phcareascontroller.js");
// POST /phc/areas/create
router.post("/areas/create", auth, phcsareaController.createArea);
// GET /phc/areas/list
router.get("/areas/list", auth, phcsareaController.listAreas);

module.exports = router;