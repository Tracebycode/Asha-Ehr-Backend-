import express from "express";
import { authenticateheader } from "../../middleware/auth";
import { validateSyncRequest } from "./sync.middleware";
import { syncController } from "./sync.controller";

const router = express.Router();

// POST /api/sync
// Authenticated by JWT; any role may sync (ASHA, supervisor, etc.)
// Validation → Controller → Service → Repository (all inside one DB transaction)
router.post("/", authenticateheader, validateSyncRequest, syncController);

export default router;
