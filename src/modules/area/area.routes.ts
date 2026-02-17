import { Router } from "express";
import { validateareaassignment } from "./area.middleware";
import { assignareacontroller } from "./area.controller";
import { authenticateheader, authorize } from "../../middleware/auth";

const router = Router();

router.post("/assign",authenticateheader,authorize("phc_admin"),validateareaassignment, assignareacontroller);

export default router;