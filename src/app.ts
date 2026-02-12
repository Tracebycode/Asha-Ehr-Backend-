import express from "express";
import cors from "cors";
import authRoutes from "./modules/auth/auth.routes";
import { globalErrorHandler } from "./middleware/globalerrorhandler";
import userRoutes from "./modules/users/users.routes";


const app = express();
app.use(cors());



app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);






app.use(globalErrorHandler)



export default app;