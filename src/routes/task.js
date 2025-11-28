const express = require("express");
const router = express.Router(); 
const auth = require("../middleware/auth");




const taskcontroller = require("../controllers/taskcontroller");

// Define your task routes here
router.post("/create", auth, taskcontroller.createTask);
router.get("/list", authMiddleware, taskController.listTasks);



module.exports = router;