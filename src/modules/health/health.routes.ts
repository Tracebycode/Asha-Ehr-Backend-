import express from "express";
import { authenticateheader, authorize } from "../../middleware/auth";
import {
    createHealthRecordController,
    deleteHealthRecordController,
    transitionHealthRecordWorkflowController,
    updateHealthRecordController,
} from "./health.controller";
import {
    validateCreateHealthRecord,
    validateHealthRecordWorkflow,
    validateUpdateHealthRecord,
} from "./health.middleware";

const router = express.Router();

// POST   /api/health-records            – ASHA creates a new health record
router.post(
    "/",
    authenticateheader,
    authorize("asha"),
    validateCreateHealthRecord,
    createHealthRecordController
);

// PATCH  /api/health-records/:id        – ASHA updates record (version-locked)
router.patch(
    "/:id",
    authenticateheader,
    authorize("asha"),
    validateUpdateHealthRecord,
    updateHealthRecordController
);

// DELETE /api/health-records/:id        – soft delete
router.delete(
    "/:id",
    authenticateheader,
    authorize("asha"),
    deleteHealthRecordController
);

// PATCH  /api/health-records/:id/workflow – workflow transition
router.patch(
    "/:id/workflow",
    authenticateheader,
    validateHealthRecordWorkflow,
    transitionHealthRecordWorkflowController
);

export default router;
