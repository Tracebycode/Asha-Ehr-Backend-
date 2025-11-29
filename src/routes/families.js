
const express = require("express");
const router = express.Router(); 
const auth = require("../middleware/auth.js");






const familiesController = require("../controllers/familiescontroller.js");
const membersController = require("../controllers/memberscontroller.js");


// GET /families/list
router.get("/list", auth, familiesController.listFamilies);
router.post("/create", auth, familiesController.createFamily);
router.post("/add/members",auth,membersController.addMember)  // ADD THIS LINE
router.get("/byFamily/:family_id", auth, membersController.getMembersByFamily);
router.patch("/:family_id/set-head/:member_id", auth, familiesController.setHead);


module.exports = router;
