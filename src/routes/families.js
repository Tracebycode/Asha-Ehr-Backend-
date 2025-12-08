
const express = require("express");
const router = express.Router(); 
const auth = require("../middleware/auth.js");

const familiesController = require("../controllers/familycontroller.js");
const membersController = require("../controllers/membercontroller.js");

// ===============================
// Existing routes
// ===============================

// GET /families/list (role-based)
router.get("/list", auth, familiesController.listFamilies);

// POST /families/create (ASHA only)
router.post("/create", auth, familiesController.createFamily);

// POST /families/add/members
router.post("/add/members", auth, membersController.addMember);

// GET members of a family
router.get("/byFamily/:family_id", auth, membersController.getMembersByFamily);

// PATCH set head of family
router.patch("/:family_id/set-head/:member_id", auth, familiesController.setHead);


// ===============================
// NEW ROUTES (IMPORTANT)
// ===============================

// 🔎 Search existing families (ASHA only)
router.get("/search", auth, familiesController.searchFamilies);

// 📦 Download full family bundle
router.get("/:id/full", auth, familiesController.getFullFamily);


module.exports = router;
