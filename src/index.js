const express = require("express");
const cors = require("cors");

const authController = require("./controllers/authController");
const userController = require("./controllers/usercontroller");
const familiesController = require("./controllers/familiesController");



const auth = require("./middleware/auth");



const app = express();
app.use(cors());
app.use(express.json());

// Login route
app.post("/auth/login", authController.login);
app.post("/phc/users/create", auth, userController.createUser);
app.use("/families", require("./routes/families"));
app.use("/phcs", require("./routes/phcs"));
app.use("/health", require("./routes/health"));



const PORT = 3000;
app.listen(PORT, () => console.log("Server running on port", PORT));


