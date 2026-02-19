import pool from "../../lib/db";
import { userjwtType } from "../../types/userjwt";
import AppError from "../../utils/Apperror";
import {
    createHealthRecord,
    findHealthRecordById,
    findMemberContext,
    softDeleteHealthRecord,
    updateHealthRecord,
    updateHealthRecordWorkflow,
} from "./health.repository";
import {
    HealthRecordCreateType,
    HealthRecordUpdateType,
    HealthRecordWorkflowType,
} from "./health.types";

// ─── Allowed workflow transitions ──────────────────────────────────────────────
// draft → submitted → verified → locked
// verified → corrected (supervisor correction path)
const WORKFLOW_TRANSITIONS: Record<string, string[]> = {
    draft: ["submitted"],
    submitted: ["verified"],
    verified: ["locked", "corrected"],
    locked: [],
    corrected: ["submitted"],
};




// ─── Roles that may verify / lock a record ────────────────────────────────────
const VERIFICATION_ROLES = ["supervisor", "phc_officer", "admin"];






// ─── Create ────────────────────────────────────────────────────────────────────
export async function createHealthRecordService(
    body: HealthRecordCreateType,
    user: userjwtType
) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // Resolve member → family → area/asha ownership
        const ctx = await findMemberContext(body.member_id, client);
        if (!ctx) {
            throw new AppError("Member not found or inactive", 404);
        }

        // ASHA can only create records for members in their own area
        if (user.role === "asha" && ctx.asha_id !== user.userid) {
            throw new AppError(
                "Forbidden: you can only create records for members assigned to you",
                403
            );
        }

        const record = {
            phc_id: ctx.phc_id,
            area_id: ctx.area_id,
            member_id: body.member_id,
            asha_id: user.userid,
            task_id: body.task_id ?? null,
            visit_type: body.visit_type,
            data_json: body.data_json,
            last_modified_by: user.userid,
            last_modified_role: user.role,
            last_modified_device: body.device_id,
            device_id: body.device_id,
            device_created_at: body.device_created_at,
            device_updated_at: body.device_updated_at,
            synced_at: body.synced_at ?? null,
        };

        const result = await createHealthRecord(record, client);
        await client.query("COMMIT");
        return result;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}




// ─── Update ────────────────────────────────────────────────────────────────────
export async function updateHealthRecordService(
    id: string,
    body: HealthRecordUpdateType,
    user: userjwtType
) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const current = await findHealthRecordById(id, client);
        if (!current) {
            throw new AppError("Health record not found or inactive", 404);
        }

        // Prevent any edit when the record is locked
        if (current.workflow_status === "locked") {
            throw new AppError("Cannot update a locked health record", 403);
        }

        // ASHA can only edit their own records
        if (user.role === "asha" && current.asha_id !== user.userid) {
            throw new AppError(
                "Forbidden: you can only update records you created",
                403
            );
        }

        // Optimistic locking – version must match
        if (current.version !== body.version) {
            throw new AppError(
                `Version conflict: expected ${current.version}, got ${body.version}`,
                409
            );
        }

        const updated = await updateHealthRecord(
            id,
            {
                data_json: body.data_json,
                task_id: body.task_id,
                last_modified_by: user.userid,
                last_modified_role: user.role,
                last_modified_device: body.device_id,
                device_id: body.device_id,
                device_updated_at: body.device_updated_at,
                synced_at: body.synced_at,
            },
            body.version,
            client
        );

        if (!updated) {
            throw new AppError(
                "Update failed: version conflict or record not found",
                409
            );
        }

        await client.query("COMMIT");
        return updated;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}




// ─── Soft delete ───────────────────────────────────────────────────────────────
export async function deleteHealthRecordService(id: string, user: userjwtType) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const current = await findHealthRecordById(id, client);
        if (!current) {
            throw new AppError("Health record not found or already deleted", 404);
        }

        if (current.workflow_status === "locked") {
            throw new AppError("Cannot delete a locked health record", 403);
        }

        // ASHA can only delete their own records
        if (user.role === "asha" && current.asha_id !== user.userid) {
            throw new AppError(
                "Forbidden: you can only delete records you created",
                403
            );
        }

        const deleted = await softDeleteHealthRecord(
            id,
            user.userid,
            user.role,
            (user as any).device_id ?? "unknown",
            client
        );

        await client.query("COMMIT");
        return deleted;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}



// ─── Workflow transition ───────────────────────────────────────────────────────
export async function transitionHealthRecordWorkflowService(
    id: string,
    body: HealthRecordWorkflowType,
    user: userjwtType
) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const current = await findHealthRecordById(id, client);
        if (!current) {
            throw new AppError("Health record not found or inactive", 404);
        }

        // Validate the transition is allowed from the current state
        const allowed = WORKFLOW_TRANSITIONS[current.workflow_status] ?? [];
        if (!allowed.includes(body.workflow_status)) {
            throw new AppError(
                `Invalid transition: '${current.workflow_status}' → '${body.workflow_status}'. Allowed: [${allowed.join(", ") || "none"}]`,
                422
            );
        }

        // Only authorised roles may verify or lock a record
        if (
            ["verified", "locked", "corrected"].includes(body.workflow_status) &&
            !VERIFICATION_ROLES.includes(user.role)
        ) {
            throw new AppError(
                `Only ${VERIFICATION_ROLES.join(" / ")} can set status to '${body.workflow_status}'`,
                403
            );
        }

        // Optimistic locking
        if (current.version !== body.version) {
            throw new AppError(
                `Version conflict: expected ${current.version}, got ${body.version}`,
                409
            );
        }

        const updated = await updateHealthRecordWorkflow(
            id,
            body.workflow_status,
            user.userid,
            user.role,
            body.device_id,
            body.device_id,
            body.device_updated_at,
            body.version,
            client
        );

        if (!updated) {
            throw new AppError(
                "Workflow update failed: version conflict or record not found",
                409
            );
        }

        await client.query("COMMIT");
        return updated;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}
