const express = require("express");
const cors = require("cors");

const authController = require("./controllers/authController");
const userController = require("./controllers/usercontroller");


const auth = require("./middleware/auth");



const app = express();
app.use(cors());
app.use(express.json());

// Login route
app.post("/auth/login", authController.login);
app.post("/phc/users/create", auth, userController.createUser);


const PORT = 3000;
app.listen(PORT, () => console.log("Server running on port", PORT));


