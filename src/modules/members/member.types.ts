// ─── DB-level type (used in repository) ───────────────────────────────────────
export interface MemberType {
    family_id: string;
    phc_id: string;
    area_id: string;
    asha_id: string;
    full_name: string;
    gender: string;
    date_of_birth: string;
    relation_to_head: string;
    aadhaar_number?: string | null;
    mobile_number?: string | null;
    last_modified_by: string;
    last_modified_role: string;
    last_modified_device: string;
    synced_at: string;
}

// ─── Payload from the request body (create) ───────────────────────────────────
export interface MemberCreateType {
    family_id: string;
    full_name: string;
    gender: string;
    date_of_birth: string;
    relation_to_head: string;
    aadhaar_number?: string | null;
    mobile_number?: string | null;
    device_name: string;
    device_created_at: string;
}

// ─── Payload from the request body (update) ───────────────────────────────────
export interface MemberUpdateType {
    full_name?: string;
    gender?: string;
    date_of_birth?: string;
    relation_to_head?: string;
    aadhaar_number?: string | null;
    mobile_number?: string | null;
    version: number;
    device_name: string;
    device_updated_at: string;
}

// ─── Workflow transition payload ───────────────────────────────────────────────
export interface MemberWorkflowType {
    workflow_status: "submitted" | "verified" | "locked";
    version: number;
    device_name: string;
    device_updated_at: string;
}
