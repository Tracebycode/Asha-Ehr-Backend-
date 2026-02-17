import { Router } from "express";
import { createUserController } from "./users.controller";
import { validateCreateUser } from "./users.middleware";
import { authenticateheader, authorize } from "../../middleware/auth";

const router = Router();

router.post("/create",authenticateheader, authorize("phc_admin"), validateCreateUser, createUserController);

export default router;