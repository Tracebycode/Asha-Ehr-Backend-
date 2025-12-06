const express = require("express");
const cors = require("cors");

const authController = require("./controllers/authcontrollers.js");
const userController = require("./controllers/usercontrollers.js");



const auth = require("./middleware/auth.js");

const app = express();
app.use(cors());
app.use(express.json());

// ⭐ ADD THIS FIRST
app.use("/", require("./routes/ashaUpdate"));

// Login route
app.post("/auth/login", authController.login);
app.post("/phc/users/create", auth, userController.createUser);

// Other routes
app.use("/families", require("./routes/families"));
app.use("/phcs", require("./routes/phcs"));
app.use("/health", require("./routes/health"));
app.use("/tasks", require("./routes/task"));
app.use("/sync", require("./routes/sync"))

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log("Server running on port", PORT));
