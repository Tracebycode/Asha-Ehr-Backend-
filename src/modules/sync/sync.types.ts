// ─── Primitive change sent by the device ──────────────────────────────────────

export type SyncOperation = "insert" | "update" | "delete";

export interface SyncChange {
    id: string;                        // client-provided UUID
    operation: SyncOperation;
    version: number;                   // client's current version
    data: Record<string, unknown>; 
    metadata: Record<string, unknown>;    // field map (empty for delete)
}

// ─── Validated request body ────────────────────────────────────────────────────

export interface SyncRequestBody {
    request_id: string;
    device_id: string;
    last_sync_seq: number;
    changes: {
        families: SyncChange[];
        family_members: SyncChange[];
        health_records: SyncChange[];
        tasks: SyncChange[];
    };
}

// ─── Per-row outcomes ─────────────────────────────────────────────────────────

export interface AppliedEntry {
    table: string;
    id: string;
}

export interface ConflictEntry {
    table: string;
    id: string;
    server_version: number;
    server_data: Record<string, unknown>;
}

// ─── Delta pulled from the server ─────────────────────────────────────────────

export interface DeltaChanges {
    families: Record<string, unknown>[];
    family_members: Record<string, unknown>[];
    health_records: Record<string, unknown>[];
    tasks: Record<string, unknown>[];
}

// ─── Final response sent to client ────────────────────────────────────────────

export interface SyncResponse {
    applied: AppliedEntry[];
    conflicts: ConflictEntry[];
    // changes: DeltaChanges;
    // new_sync_seq: number;
}



// Shape returned by FetchAshaData — maps directly to asha_workers DB columns
export interface ashadatatype {
    user_id: string;
    phc_id: string;
    area_id: string;
}

/**
 * Bundle of server-side ownership + audit values that are injected into every
 * sync change before it is written to the DB.  Built ONCE per request from
 * the JWT user and the single ASHA DB fetch.
 */


export interface AshaContext {
    // ownership — overrides whatever the client sent
    asha_id: string;
    phc_id: string;
    area_id: string;
    // audit — who last touched the row
    last_modified_by: string;
    last_modified_role: string;
}