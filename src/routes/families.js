// src/routes/families.js
const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth"); // or correct path
const familiesController = require("../controllers/families"); // path to the file you showed

// CREATE FAMILY
router.post("/", auth, familiesController.createFamily);

// LIST FAMILIES
router.get("/", auth, familiesController.listFamilies);

// SEARCH FAMILIES (important: keep before "/:id" routes)
router.get("/search", auth, familiesController.searchFamilies);

// FULL FAMILY BUNDLE
router.get("/:id/full", auth, familiesController.getFullFamily);

// SET HEAD (example path, adjust if you have different route)
router.post("/:family_id/head/:member_id", auth, familiesController.setHead);

module.exports = router;
