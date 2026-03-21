import pool from "../../lib/db";
import { SyncRequestBody, SyncResponse, AppliedEntry, ConflictEntry, AshaContext } from "./sync.types";
import {
    findStoredSyncResponse,
    storeSyncResponse,
    applyTableChanges,
    pullAllDeltas,
    FetchAshaData
} from "./sync.repository";
import { userjwtType } from "../../types/userjwt";




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
    user: userjwtType        // ← from JWT; used for last_modified_role
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
        

        //── Fetch ASHA record ONCE (server-authoritative, never trusted from client) ──
        const ashaRecord = await FetchAshaData(user.userid);

        // Build the immutable context passed into every applyTableChanges call
        const ashaCtx: AshaContext = {
            asha_id:            ashaRecord.user_id,
            phc_id:             ashaRecord.phc_id,
            area_id:            ashaRecord.area_id,
            last_modified_by:   user.userid,
            last_modified_role: user.role,
        };
        console.log("ashaCtx", ashaCtx);

        for (const tableKey of TABLE_ORDER) {
            const changes = body.changes[tableKey];
            if (changes.length === 0) continue;

            // Map camelCase/snake_case key → actual DB table name
            const dbTable = tableKey; // keys are already snake_case matching DB table names
            await applyTableChanges(dbTable, changes, applied, conflicts, client, ashaCtx);
        }









        

        // ── 3. Delta pull ─────────────────────────────────────────────────────────
        // const { changes: deltaChanges, new_sync_seq } = await pullAllDeltas(
        //     body.last_sync_seq,
        //     client
        // );



        // ── 4. Build response ─────────────────────────────────────────────────────
        const response: SyncResponse = {
            applied,
            conflicts,
            // changes: deltaChanges,
            // new_sync_seq,
        };

        // ── 5. Persist idempotency record inside same transaction ─────────────────
        await storeSyncResponse(
            body.request_id,
            user.userid,
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
