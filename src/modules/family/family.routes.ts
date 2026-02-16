import express from "express";
import { createFamilyController } from "./family.controller";
import { authenthicate } from "./family.middleware";
import { authorize } from "./family.middleware";
import { validateFamily } from "./family.middleware";

const router = express.Router();

router.post("/",authenthicate,authorize("asha"),validateFamily, createFamilyController);

export default router;