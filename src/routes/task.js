const express = require("express");
const router = express.Router(); 
const auth = require("../middleware/auth.js");




const taskcontroller = require("../controllers/taskcontrollers.js");

// Define your task routes here
router.post("/create", auth, taskcontroller.createTask);
router.get("/list", auth, taskcontroller.listTasks);



module.exports = router;