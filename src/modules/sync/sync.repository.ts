import { PoolClient } from "pg";
import pool from "../../lib/db";
import { SyncChange, AppliedEntry, ConflictEntry, DeltaChanges, ashadatatype, AshaContext } from "./sync.types";
import AppError from "../../utils/Apperror";
import { version } from "node:os";



//ownership field for every table

const ownershipConfig:Record<string,(keyof AshaContext)[]> ={
    families:["phc_id","asha_id","area_id","last_modified_by","last_modified_role"],
    family_members:[],
    health_records:["phc_id","asha_id","area_id"],
    tasks:[],
}


/**
 * Process all changes for a single table in order.
 * Appends results to the provided applied/conflicts arrays.
 */

export const applyTableChanges = async (
    table: string,
    changes: SyncChange[],
    applied: AppliedEntry[],
    conflicts: ConflictEntry[],
    client: PoolClient,
    asha: AshaContext          // ← server-side ownership + audit context
): Promise<void> => {
    for (const change of changes) {
      
      const fields = ownershipConfig[table] || [];

        for (const field of fields) {
            const value = asha[field];
            if (!value) {
                throw new Error(`Missing ${field} for table ${table}`);
            }
            change.data[field] = value;
}
        // ────────────────────────────────────────────────────────────────────────

        if (change.operation === "insert") {
            const outcome = await insertRow(table, change, client, asha);
            if (outcome === "inserted" || outcome === "skipped") {
                // Both count as applied — the idempotency case (skipped) means the row
                // is already there, so the client's intent was fulfilled.
                applied.push({ table, id: change.id });
            }
        } else if (change.operation === "update") {
            const outcome = await updateRow(table, change, client);
            if (outcome === "updated") {
                applied.push({ table, id: change.id });
            } else {
                conflicts.push(outcome);
            }
        } else {
            // delete
            const outcome = await deleteRow(table, change, client);
            if (outcome === "deleted" || outcome === "skipped") {
                applied.push({ table, id: change.id });
            } else {
                conflicts.push(outcome);
            }
        }
    }
};







// ─── Insert ───────────────────────────────────────────────────────────────────

/**
 * Insert a row using the client-provided UUID and data.
 * Required sync fields (version, is_active, sync_seq, created_at, updated_at)
 * are always forced to their correct initial values.
 * Uses ON CONFLICT (id) DO NOTHING so a retry doesn't fail.
 *
 * @returns "inserted" | "skipped"
 */
export const insertRow = async (
    table: string,
    change: SyncChange,
    client: PoolClient,
    asha: AshaContext
): Promise<"inserted" | "skipped"> => {
    // Merge caller data but always override sync-critical fields
    const data = { ...change.data };
    const metadata = { ...change.metadata };

    // Build column list and value list dynamically, excluding protected columns
    const PROTECTED = new Set(["id", "version", "is_active", "sync_seq", "created_at", "updated_at"]);
    const userCols = Object.keys(data).filter((k) => !PROTECTED.has(k));
    const metadataCols = Object.keys(metadata).filter((k) => !PROTECTED.has(k));



  const values: unknown[] = [change.id, change.version];

// user data
for (const col of userCols) {
    const val = data[col];
    values.push(typeof val === "object" && val !== null ? JSON.stringify(val) : val);
}

// metadata
for (const col of metadataCols) {
    const val = metadata[col];
    values.push(typeof val === "object" && val !== null ? JSON.stringify(val) : val);
}

// controlled
values.push(true);

const cleanCols = [
    "id",
    "version",
    ...userCols,
    ...metadataCols,
    "is_active",
    "sync_seq",
    "created_at",
    "updated_at"
];

const cleanPlaceholders: string[] = [];

// placeholders for values
for (let i = 1; i <= values.length; i++) {
    cleanPlaceholders.push(`$${i}`);
}

// raw SQL expressions
cleanPlaceholders.push("nextval('global_sync_seq')");
cleanPlaceholders.push("NOW()");
cleanPlaceholders.push("NOW()");
    
    const cleanQuery = `
    INSERT INTO ${table} (${cleanCols.join(", ")})
    VALUES (${cleanPlaceholders.join(", ")})
    ON CONFLICT (id) DO NOTHING
  `;

  try{
    const result = await client.query(cleanQuery, values);
    return result.rowCount && result.rowCount > 0 ? "inserted" : "skipped";
  } catch (error: any) {
    console.error("❌ REAL DB ERROR:", error);
    console.error("❌ QUERY:", cleanQuery);
    console.error("❌ VALUES:", values);
    throw error; // 🔥 DO NOT WRAP
}
};








// ─── Update ───────────────────────────────────────────────────────────────────

/**
 * Apply an optimistic-concurrency update.
 * Returns "updated" on success, or a ConflictEntry if the version doesn't match.
 */
export const updateRow = async (
    table: string,
    change: SyncChange,
    client: PoolClient
): Promise<"updated" | ConflictEntry> => {
    const data = { ...change.data };
    const PROTECTED = new Set(["id", "version", "sync_seq", "updated_at", "created_at"]);
    const userCols = Object.keys(data).filter((k) => !PROTECTED.has(k));

    if (userCols.length === 0) {
        // Nothing to set — treat as conflict-free no-op
        return "updated";
    }

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    for (const col of userCols) {
        const val = data[col];
        setClauses.push(`${col} = $${idx++}`);
        values.push(typeof val === "object" && val !== null ? JSON.stringify(val) : val);
    }

    // Always bump version + sync_seq + updated_at
    setClauses.push(`version = version + 1`);
    setClauses.push(`sync_seq = nextval('global_sync_seq')`);
    setClauses.push(`updated_at = NOW()`);

    values.push(change.id);       // $idx   – WHERE id
    const idIdx = idx++;
    values.push(change.version);  // $idx   – WHERE version
    const verIdx = idx++;

    const updateQuery = `
    UPDATE ${table}
    SET ${setClauses.join(", ")}
    WHERE id = $${idIdx}
      AND version = $${verIdx}
      AND is_active = true
  `;

    const result = await client.query(updateQuery, values);

    if (result.rowCount && result.rowCount > 0) {
        return "updated";
    }

    // Row existed but version didn't match → return server state
    const current = await findRowById(table, change.id, client);
    if (!current) {
        // Row doesn't exist at all — conflict (could not insert because caller sent "update")
        return {
            table,
            id: change.id,
            server_version: 0,
            server_data: {},
        };
    }


    return {
        table,
        id: change.id,
        server_version: current.version as number,
        server_data: current,
    };
};

// ─── Delete (soft) ────────────────────────────────────────────────────────────

/**
 * Soft-delete a row using optimistic concurrency.
 * Returns "deleted" | "skipped" (already inactive) | ConflictEntry (version mismatch).
 */
export const deleteRow = async (
    table: string,
    change: SyncChange,
    client: PoolClient
): Promise<"deleted" | "skipped" | ConflictEntry> => {
    const result = await client.query(
        `UPDATE ${table}
     SET
       is_active   = false,
       version     = version + 1,
       updated_at  = NOW(),
       sync_seq    = nextval('global_sync_seq')
     WHERE id      = $1
       AND version = $2
       AND is_active = true`,
        [change.id, change.version]
    );

    if (result.rowCount && result.rowCount > 0) {
        return "deleted";
    }

    // Check whether the row simply doesn't exist or is already inactive
    const existing = await client.query(
        `SELECT * FROM ${table} WHERE id = $1`,
        [change.id]
    );

    if (existing.rows.length === 0) {
        // Row never existed — idempotent skip
        return "skipped";
    }

    const row = existing.rows[0];

    if (row.is_active === false) {
        // Already deleted — idempotent skip
        return "skipped";
    }

    // Row is active but version mismatched → conflict
    return {
        table,
        id: change.id,
        server_version: row.version as number,
        server_data: row,
    };
};





// ─── Delta pull ───────────────────────────────────────────────────────────────

const DELTA_LIMIT = 200;

/**
 * Pull all rows modified since last_sync_seq for a single table.
 * Tasks may not have sync_seq; we handle that gracefully by skipping the table
 * when the column does not exist (the query will simply return nothing in that case).
 */
const pullDelta = async (
    table: string,
    lastSyncSeq: number,
    client: PoolClient
): Promise<Record<string, unknown>[]> => {
    try {
        const result = await client.query(
            `SELECT * FROM ${table}
       WHERE sync_seq > $1
       ORDER BY sync_seq
       LIMIT $2`,
            [lastSyncSeq, DELTA_LIMIT]
        );
        return result.rows;
    } catch(error) {
    
        // If the table doesn't have sync_seq (e.g. tasks), return empty array
        return [];
        throw new AppError("Error fetching delta", 500);
    }
};

/**
 * Pull deltas for all four syncable tables and compute the highest sync_seq seen.
 */
export const pullAllDeltas = async (
    lastSyncSeq: number,
    client: PoolClient
): Promise<{ changes: DeltaChanges; new_sync_seq: number }> => {

    const [families, family_members, health_records] = await Promise.all([
        pullDelta("families", lastSyncSeq, client),
        pullDelta("family_members", lastSyncSeq, client),
        pullDelta("health_records", lastSyncSeq, client),
       
    ]);

    const allRows = [...families, ...family_members, ...health_records];
    const new_sync_seq = allRows.reduce((max, row) => {
        const seq = typeof row.sync_seq === "number" ? row.sync_seq : Number(row.sync_seq ?? 0);
        return seq > max ? seq : max;
    }, lastSyncSeq);

    return {
        changes: { families, family_members, health_records },
        new_sync_seq,
    };
};





























































// ─── ASHA ownership fetch ─────────────────────────────────────────────────────

/**
 * Fetch the authoritative ASHA record for the authenticated user.
 * Called ONCE per sync request, BEFORE the transaction begins, so we stay
 * outside the main pool-client and avoid holding the connection longer.
 *
 * Throws if no asha_workers row is found for the given user_id — this means
 * the JWT belongs to a non-ASHA user who should not be syncing.
 */
export const FetchAshaData = async (userId: string): Promise<ashadatatype> => {
    const result = await pool.query(
        `
        SELECT 
            u.id AS user_id,
            u.phc_id,
            u.role,
            uam.area_id
        FROM users u
        JOIN user_area_map uam 
            ON u.id = uam.user_id
        WHERE u.id = $1
          AND u.is_active = true
          AND uam.is_active = true
        LIMIT 1
        `,
        [userId]
    );

    if (result.rows.length === 0) {
        throw new Error(`No active ASHA mapping found for user_id: ${userId}`);
    }

    return result.rows[0];
};



// ─── Idempotency ──────────────────────────────────────────────────────────────

/**
 * Check if a request_id has already been processed.
 * Returns the stored response payload if found, or null if this is a new request.
 */

export const findStoredSyncResponse = async (
    requestId: string,
    client: PoolClient
): Promise<Record<string, unknown> | null> => {
    const result = await client.query(
        `SELECT response_payload FROM sync_requests WHERE request_id = $1`,
        [requestId]
    );
    return result.rows[0]?.response_payload ?? null;
};

/**
 * Persist the final response so that repeated requests with the same
 * request_id return an identical answer without re-processing.
 */
export const storeSyncResponse = async (
    requestId: string,
    userId: string,
    deviceId: string,
    responsePayload: Record<string, unknown>,
    client: PoolClient
): Promise<void> => {
    await client.query(
        `INSERT INTO sync_requests (request_id, user_id, device_id, response_payload)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (request_id) DO NOTHING`,
        [requestId, userId, deviceId, JSON.stringify(responsePayload)]
    );
};

// ─── Generic helpers ──────────────────────────────────────────────────────────

/**
 * Fetch a single row by id from any syncable table.
 * Returns null if the row does not exist or is soft-deleted.
 */
const findRowById = async (
    table: string,
    id: string,
    client: PoolClient
): Promise<Record<string, unknown> | null> => {
    // Table name is never user-supplied; it comes from our fixed internal list.
    const result = await client.query(
        `SELECT * FROM ${table} WHERE id = $1 AND is_active = true`,
        [id]
    );
    return result.rows[0] ?? null;
};


















// ─── Apply changes for one table ──────────────────────────────────────────────

