import express from "express";
import cors from "cors";
import authRoutes from "./modules/auth/auth.routes";
import { globalErrorHandler } from "./middleware/globalerrorhandler";
import userRoutes from "./modules/users/users.routes";
import familyRoutes from "./modules/family/family.routes";

const app = express();
app.use(cors());



app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/families", familyRoutes);







app.use(globalErrorHandler)



export default app;