import pool from "../../lib/db";
import { userjwtType } from "../../types/userjwt";
import AppError from "../../utils/Apperror";
import {
    createMember,
    findFamilyById,
    findMemberByAadhaar,
    findMemberById,
    softDeleteMember,
    updateMember,
    updateMemberWorkflow,
} from "./member.repository";
import { MemberCreateType, MemberUpdateType, MemberWorkflowType } from "./member.types";





// ─── Allowed workflow transitions ──────────────────────────────────────────────
const WORKFLOW_TRANSITIONS: Record<string, string[]> = {
    draft: ["submitted"],
    submitted: ["verified"],
    verified: ["locked"],
    locked: [],
};




// ─── Create ────────────────────────────────────────────────────────────────────
export async function createMemberService(
    body: MemberCreateType,
    user: userjwtType
) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // Verify the family exists and is active
        const family = await findFamilyById(body.family_id, client);
        if (!family) {
            throw new AppError("Family not found or inactive", 404);
        }

        // Aadhaar uniqueness check (only when provided)
        if (body.adhar_number) {
            const existing = await findMemberByAadhaar(body.adhar_number, null, client);
            if (existing) {
                throw new AppError("A member with this Aadhaar number already exists", 409);
            }
        }

        const newMember = {
            family_id: body.family_id,
            full_name: body.full_name,
            gender: body.gender,
            date_of_birth: body.date_of_birth,
            relation_to_head: body.relation_to_head,
            adhar_number: body.adhar_number ?? null,
            mobile_number: body.mobile_number ?? null,
            last_modified_by: user.userid,
            last_modified_role: user.role,
            last_modified_device: body.device_name,
            synced_at: body.device_created_at,
        };

        const result = await createMember(newMember, client);
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

export async function updateMemberService(
    id: string,
    body: MemberUpdateType,
    user: userjwtType
) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // Fetch current record
        const current = await findMemberById(id, client);
        if (!current) {
            throw new AppError("Member not found or inactive", 404);
        }

        // Prevent update when locked
        if (current.workflow_status === "locked") {
            throw new AppError("Cannot update a locked member record", 403);
        }

        // Optimistic locking – version must match
        if (current.version !== body.version) {
            throw new AppError(
                `Version conflict: expected ${current.version}, got ${body.version}`,
                409
            );
        }

        // Aadhaar uniqueness check (only when changing Aadhaar)
        if (body.aadhaar_number && body.aadhaar_number !== current.aadhaar_number) {
            const existing = await findMemberByAadhaar(body.aadhaar_number, id, client);
            if (existing) {
                throw new AppError("A member with this Aadhaar number already exists", 409);
            }
        }

        const updated = await updateMember(
            id,
            {
                full_name: body.full_name,
                gender: body.gender,
                date_of_birth: body.date_of_birth,
                relation_to_head: body.relation_to_head,
                aadhaar_number: body.aadhaar_number,
                mobile_number: body.mobile_number,
                last_modified_by: user.userid,
                last_modified_role: user.role,
                last_modified_device: body.device_name,
                device_updated_at: body.device_updated_at,
            },
            body.version,
            client
        );

        if (!updated) {
            // Row disappeared between SELECT and UPDATE (race condition)
            throw new AppError("Update failed: version conflict or record not found", 409);
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
export async function deleteMemberService(id: string, user: userjwtType) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const current = await findMemberById(id, client);
        if (!current) {
            throw new AppError("Member not found or already deleted", 404);
        }

        if (current.workflow_status === "locked") {
            throw new AppError("Cannot delete a locked member record", 403);
        }

        const deleted = await softDeleteMember(
            id,
            user.userid,
            user.role,
            // device_id from JWT; fall back to a placeholder if not present
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
export async function transitionMemberWorkflowService(
    id: string,
    body: MemberWorkflowType,
    user: userjwtType
) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const current = await findMemberById(id, client);
        if (!current) {
            throw new AppError("Member not found or inactive", 404);
        }

        // Validate transition
        const allowed = WORKFLOW_TRANSITIONS[current.workflow_status] ?? [];
        if (!allowed.includes(body.workflow_status)) {
            throw new AppError(
                `Invalid transition: '${current.workflow_status}' → '${body.workflow_status}'. Allowed: [${allowed.join(", ") || "none"}]`,
                422
            );
        }

        // Optimistic locking
        if (current.version !== body.version) {
            throw new AppError(
                `Version conflict: expected ${current.version}, got ${body.version}`,
                409
            );
        }

        const updated = await updateMemberWorkflow(
            id,
            body.workflow_status,
            user.userid,
            user.role,
            body.device_name,
            body.device_updated_at,
            body.version,
            client
        );

        if (!updated) {
            throw new AppError("Workflow update failed: version conflict or record not found", 409);
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
