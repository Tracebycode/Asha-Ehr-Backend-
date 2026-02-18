import express from "express";
import { authenticateheader, authorize } from "../../middleware/auth";
import {
    createMemberController,
    deleteMemberController,
    transitionMemberWorkflowController,
    updateMemberController,
} from "./member.controller";
import {
    validateCreateMember,
    validateMemberWorkflow,
    validateUpdateMember,
} from "./member.middleware";

const router = express.Router();

// POST   /api/members            – create a new family member
router.post(
    "/",
    authenticateheader,
    authorize("asha"),
    validateCreateMember,
    createMemberController
);

// PATCH  /api/members/:id        – update member details (version-locked)
router.patch(
    "/:id",
    authenticateheader,
    authorize("asha"),
    validateUpdateMember,
    updateMemberController
);

// DELETE /api/members/:id        – soft delete
router.delete(
    "/:id",
    authenticateheader,
    authorize("asha"),
    deleteMemberController
);

// PATCH  /api/members/:id/workflow – workflow transition
router.patch(
    "/:id/workflow",
    authenticateheader,
    authorize("asha"),
    validateMemberWorkflow,
    transitionMemberWorkflowController
);

export default router;
