import { Router } from "express";
import { createUserController } from "./users.controller";
import { validateCreateUser, authenticateheader, authorizeRole } from "./users.middleware";

const router = Router();

router.post("/create",authenticateheader, authorizeRole("phc_admin"), validateCreateUser, createUserController);

export default router;