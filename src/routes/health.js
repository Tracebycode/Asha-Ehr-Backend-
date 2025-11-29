const express = require("express");
const router = express.Router();
const healthController = require("../controllers/healthController.js");
const auth = require("../middleware/auth.js");

router.post("/add", auth, healthController.addHealthRecord);
router.get("/member/:member_id", auth, healthController.getByMember);
router.get("/byfamily/:family_id", auth, healthController.getByFamily);
router.get("/list", auth, healthController.list);


module.exports = router;
