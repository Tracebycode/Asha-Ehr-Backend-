import express from "express";
import { createFamilyController } from "./family.controller";
import { validateFamily } from "./family.middleware";
import { authenticateheader, authorize } from "../../middleware/auth";

const router = express.Router();

router.post("/",authenticateheader,authorize("asha"),validateFamily, createFamilyController);

export default router;