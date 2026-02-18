import express from "express";
import cors from "cors";
import authRoutes from "./modules/auth/auth.routes";
import { globalErrorHandler } from "./middleware/globalerrorhandler";
import userRoutes from "./modules/users/users.routes";
import familyRoutes from "./modules/family/family.routes";
import areaRoutes from "./modules/area/area.routes";
import memberRoutes from "./modules/members/member.routes";
import healthRoutes from "./modules/health/health.routes";

const app = express();
app.use(cors());



app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/areas", areaRoutes);
app.use("/api/families", familyRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/health-records", healthRoutes);







app.use(globalErrorHandler)



export default app;