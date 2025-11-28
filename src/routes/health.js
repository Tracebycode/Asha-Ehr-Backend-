const express = require("express");
const router = express.Router();
const healthController = require("../controllers/healthController");
const auth = require("../middleware/auth");

router.post("/add", auth, healthController.addHealthRecord);
router.get("/member/:member_id", auth, healthController.getByMember);
router.get("/byfamily/:family_id", auth, healthController.getByFamily);
router.get("/list", auth, healthController.list);


module.exports = router;
