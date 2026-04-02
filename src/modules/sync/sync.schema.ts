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
        metadata: z.record(z.string(), z.any()).default({}),
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




//data valiation schema as per the table


export const familyvaliationschema = z.object({
    head_member_id: z.string().uuid("head_member_id must be a valid UUID"),
    address_line: z.string().min(1, "adress_line is required"),
    landmark: z.string().min(1, "landmark is required"),
})

export const family_members_valiationschema = z.object({
    family_id: z.string().uuid("family_id must be a valid UUID"),
    name: z.string().min(1, "name is required"),
    gender: z.string().min(1, "gender is required"),
    relation: z.string().min(1, "relation is required"),
    dob: z.string().min(1, "dob is required"),
    adhar_number: z.string().min(1, "adhar_number is required"),
    phone: z.string().min(1, "phone is required"),
    next_visit_date: z.string().min(1, "next_visit_date is required"),
}).partial().strict()

export const health_records_valiationschema = z.object({
    member_id: z.string().uuid("member_id must be a valid UUID"),
    visit_type: z.string().min(1, "visit_type is required"),
    data_json: z.record(z.string(), z.any()).default({}),
})



export const metadata_valiationschema = z.object({
   device_created_at: z.string().min(1, "device_created_at is required"),
   device_updated_at: z.string().min(1, "device_updated_at is required"),
   last_modified_device: z.string().min(1, "last_modified_device is required"),
})


export const tableSchemas: Record<string, z.ZodSchema<any>> = {
  families: familyvaliationschema.partial().strict(),
  family_members: family_members_valiationschema.partial().strict(),
  health_records: health_records_valiationschema.partial().strict(),
};

export type Tablename = keyof SyncRequestSchema["changes"];
 