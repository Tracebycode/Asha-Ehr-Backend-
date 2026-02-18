import { z } from "zod";

// ─── Create ────────────────────────────────────────────────────────────────────
export const createMemberSchema = z.object({
    family_id: z.string().uuid("family_id must be a valid UUID"),
    full_name: z.string().min(1, "full_name is required"),
    gender: z.enum(["male", "female", "other"], { message: "gender must be male | female | other" }),
    date_of_birth: z.string().min(1, "date_of_birth is required"),
    relation_to_head: z.string().min(1, "relation_to_head is required"),
    aadhaar_number: z.string().length(12, "aadhaar_number must be 12 digits").optional().nullable(),
    mobile_number: z.string().length(10, "mobile_number must be 10 digits").optional().nullable(),
    device_name: z.string().min(1, "device_name is required"),
    device_created_at: z.string().min(1, "device_created_at is required"),
});



// ─── Update ────────────────────────────────────────────────────────────────────
export const updateMemberSchema = z.object({
    full_name: z.string().min(1).optional(),
    gender: z.enum(["male", "female", "other"]).optional(),
    date_of_birth: z.string().optional(),
    relation_to_head: z.string().optional(),
    aadhaar_number: z.string().length(12).optional().nullable(),
    mobile_number: z.string().length(10).optional().nullable(),
    version: z.number().int().positive("version is required"),
    device_name: z.string().min(1, "device_name is required"),
    device_updated_at: z.string().min(1, "device_updated_at is required"),
});

// ─── Workflow transition ───────────────────────────────────────────────────────



export const workflowMemberSchema = z.object({
    workflow_status: z.enum(["submitted", "verified", "locked"], {
        message: "workflow_status must be submitted | verified | locked",
    }),
    version: z.number().int().positive("version is required"),
    device_name: z.string().min(1, "device_name is required"),
    device_updated_at: z.string().min(1, "device_updated_at is required"),
});
