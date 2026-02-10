import express from "express";
import cors from "cors";
import authRoutes from "./modules/auth/auth.routes";
import { globalErrorHandler } from "./middleware/globalerrorhandler";


const app = express();
app.use(cors());



app.use(express.json());

app.use("/api/auth", authRoutes);





app.use(globalErrorHandler)



export default app;