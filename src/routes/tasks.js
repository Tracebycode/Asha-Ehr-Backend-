const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth.js");
const taskcontroller = require("../controllers/taskcontrollers.js");

// Anm → create task
router.post("/create", auth, taskcontroller.createTask);

// List tasks
router.get("/list", auth, taskcontroller.listTasks);

// ASHA offline save/upsert
router.post("/save", auth, taskcontroller.saveTask);

// ASHA get my tasks
router.get("/my", auth, taskcontroller.getMyTasks);

module.exports = router;
