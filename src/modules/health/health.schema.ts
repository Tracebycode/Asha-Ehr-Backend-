import { z } from "zod";

// ─── Shared visit types ────────────────────────────────────────────────────────
const visitTypeEnum = z.enum(
    ["general", "anc", "pnc", "immunization", "nutrition"],
    { message: "visit_type must be general | anc | pnc | immunization | nutrition" }
);


// ─── Create ────────────────────────────────────────────────────────────────────
export const createHealthRecordSchema = z.object({
    member_id: z.string().uuid("member_id must be a valid UUID"),
    task_id: z.string().uuid("task_id must be a valid UUID").optional().nullable(),
    visit_type: visitTypeEnum,
    // data_json accepts any object – structure varies per visit_type
    data_json: z.record(z.unknown()),
    device_id: z.string().min(1, "device_id is required"),
    device_created_at: z.string().min(1, "device_created_at is required"),
    device_updated_at: z.string().min(1, "device_updated_at is required"),
    synced_at: z.string().optional().nullable(),
});

// ─── Update ────────────────────────────────────────────────────────────────────
export const updateHealthRecordSchema = z.object({
    data_json: z.record(z.unknown()).optional(),
    task_id: z.string().uuid("task_id must be a valid UUID").optional().nullable(),
    version: z.number().int().positive("version is required"),
    device_id: z.string().min(1, "device_id is required"),
    device_updated_at: z.string().min(1, "device_updated_at is required"),
    synced_at: z.string().optional().nullable(),
});

// ─── Workflow transition ───────────────────────────────────────────────────────
export const workflowHealthRecordSchema = z.object({
    workflow_status: z.enum(
        ["submitted", "verified", "locked", "corrected"],
        { message: "workflow_status must be submitted | verified | locked | corrected" }
    ),
    version: z.number().int().positive("version is required"),
    device_id: z.string().min(1, "device_id is required"),
    device_updated_at: z.string().min(1, "device_updated_at is required"),
});
