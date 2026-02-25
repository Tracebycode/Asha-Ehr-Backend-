import pool from "../../lib/db";
import { SyncRequestBody, SyncResponse, AppliedEntry, ConflictEntry } from "./sync.types";
import {
    findStoredSyncResponse,
    storeSyncResponse,
    applyTableChanges,
    pullAllDeltas,
} from "./sync.repository";




// ─── Strictly ordered table list (FK dependency order) ────────────────────────
// families → family_members → health_records → tasks



const TABLE_ORDER: Array<keyof SyncRequestBody["changes"]> = [
    "families",
    "family_members",
    "health_records",
    "tasks",
];

// ─── Sync service ─────────────────────────────────────────────────────────────

export const processSyncService = async (
    body: SyncRequestBody,
    userId: string
): Promise<SyncResponse> => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // ── 1. Idempotency check ─────────────────────────────────────────────────
        const stored = await findStoredSyncResponse(body.request_id, client);
        if (stored) {
            await client.query("ROLLBACK");
            return stored as unknown as SyncResponse;
        }

        // ── 2. Apply changes in FK-safe order ────────────────────────────────────
        const applied: AppliedEntry[] = [];
        const conflicts: ConflictEntry[] = [];

        for (const tableKey of TABLE_ORDER) {
            const changes = body.changes[tableKey];
            if (changes.length === 0) continue;

            // Map camelCase/snake_case key → actual DB table name
            const dbTable = tableKey; // keys are already snake_case matching DB table names
            await applyTableChanges(dbTable, changes, applied, conflicts, client);
        }


        

        // ── 3. Delta pull ─────────────────────────────────────────────────────────
        const { changes: deltaChanges, new_sync_seq } = await pullAllDeltas(
            body.last_sync_seq,
            client
        );

        // ── 4. Build response ─────────────────────────────────────────────────────
        const response: SyncResponse = {
            applied,
            conflicts,
            changes: deltaChanges,
            new_sync_seq,
        };

        // ── 5. Persist idempotency record inside same transaction ─────────────────
        await storeSyncResponse(
            body.request_id,
            userId,
            body.device_id,
            response as unknown as Record<string, unknown>,
            client
        );

        await client.query("COMMIT");
        return response;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};
