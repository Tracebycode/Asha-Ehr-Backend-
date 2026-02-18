// ─── Visit types allowed by the DB check constraint ───────────────────────────
export type VisitType = "general" | "anc" | "pnc" | "immunization" | "nutrition";

// ─── Workflow states allowed by the DB check constraint ───────────────────────
export type WorkflowStatus =
    | "draft"
    | "submitted"
    | "verified"
    | "locked"
    | "corrected";

// ─── DB-level entity (used in repository) ─────────────────────────────────────
// data_json is kept as `Record<string, unknown>` so any visit-type structure
// can be stored without hardcoding medical fields.
export interface HealthRecordEntity {
    phc_id: string;
    area_id: string;
    member_id: string;
    asha_id: string;
    task_id?: string | null;
    visit_type: VisitType;
    data_json: Record<string, unknown>;
    last_modified_by: string;
    last_modified_role: string;
    last_modified_device: string;
    device_id: string;
    device_created_at: string;
    device_updated_at: string;
    synced_at?: string | null;
}

// ─── Payload from the request body (create) ───────────────────────────────────
export interface HealthRecordCreateType {
    member_id: string;
    task_id?: string | null;
    visit_type: VisitType;
    data_json: Record<string, unknown>;
    device_id: string;
    device_created_at: string;
    device_updated_at: string;
    synced_at?: string | null;
}

// ─── Payload from the request body (update) ───────────────────────────────────
export interface HealthRecordUpdateType {
    data_json?: Record<string, unknown>;
    task_id?: string | null;
    version: number;
    device_id: string;
    device_updated_at: string;
    synced_at?: string | null;
}

// ─── Workflow transition payload ───────────────────────────────────────────────
export interface HealthRecordWorkflowType {
    workflow_status: Exclude<WorkflowStatus, "draft">;
    version: number;
    device_id: string;
    device_updated_at: string;
}
