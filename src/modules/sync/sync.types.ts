// ─── Primitive change sent by the device ──────────────────────────────────────

export type SyncOperation = "insert" | "update" | "delete";

export interface SyncChange {
    id: string;                        // client-provided UUID
    operation: SyncOperation;
    version: number;                   // client's current version
    data: Record<string, unknown>;     // field map (empty for delete)
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
    changes: DeltaChanges;
    new_sync_seq: number;
}
