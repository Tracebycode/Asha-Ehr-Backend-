import { z } from "zod";

// ─── Allowed operations ───────────────────────────────────────────────────────

export const operationEnum = z.enum(["insert", "update", "delete"]);

// ─── Single change from device ────────────────────────────────────────────────

export const changeSchema = z
    .object({
        id: z.string().uuid("id must be a valid UUID"),
        operation: operationEnum,
        version: z.number().int().positive("version must be a positive integer"),
        data: z.record(z.string(), z.any()).default({}),
    })
    .superRefine((val, ctx) => {
        if (
            (val.operation === "insert" || val.operation === "update") &&
            Object.keys(val.data).length === 0
        ) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `data is required for ${val.operation} operation`,
                path: ["data"],
            });
        }
        if (val.operation === "delete" && Object.keys(val.data).length > 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "data must be empty for delete operation",
                path: ["data"],
            });
        }
    });

// ─── Changes grouped by table (snake_case keys per API spec) ─────────────────

export const changesSchema = z.object({
    families: z.array(changeSchema).max(500).default([]),
    family_members: z.array(changeSchema).max(500).default([]),
    health_records: z.array(changeSchema).max(500).default([]),
    tasks: z.array(changeSchema).max(500).default([]),
});

// ─── Top-level sync request ───────────────────────────────────────────────────

export const syncRequestSchema = z.object({
    request_id: z.string().uuid("request_id must be a valid UUID"),
    device_id: z.string().min(1, "device_id is required"),
    last_sync_seq: z
        .number()
        .int()
        .min(0, "last_sync_seq must be >= 0"),
    changes: changesSchema,
});

export type SyncRequestSchema = z.infer<typeof syncRequestSchema>;