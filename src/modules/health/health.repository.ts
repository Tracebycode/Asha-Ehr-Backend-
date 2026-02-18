import { PoolClient } from "pg";
import { HealthRecordEntity } from "./health.types";

// ─── Create ────────────────────────────────────────────────────────────────────
export const createHealthRecord = async (
    record: HealthRecordEntity,
    client: PoolClient
) => {
    const query = `
    INSERT INTO health_records (
      phc_id, area_id, member_id, asha_id, task_id,
      visit_type, data_json,
      last_modified_by, last_modified_role, last_modified_device,
      device_id, device_created_at, device_updated_at, synced_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING *;
  `;
    const values = [
        record.phc_id,
        record.area_id,
        record.member_id,
        record.asha_id,
        record.task_id ?? null,
        record.visit_type,
        JSON.stringify(record.data_json),   // explicit cast keeps JSONB intact
        record.last_modified_by,
        record.last_modified_role,
        record.last_modified_device,
        record.device_id,
        record.device_created_at,
        record.device_updated_at,
        record.synced_at ?? null,
    ];
    const result = await client.query(query, values);
    return result.rows[0];
};

// ─── Find by ID ────────────────────────────────────────────────────────────────
export const findHealthRecordById = async (
    id: string,
    client: PoolClient
) => {
    const query = `
    SELECT * FROM health_records
    WHERE id = $1 AND is_active = true;
  `;
    const result = await client.query(query, [id]);
    return result.rows[0] ?? null;
};

// ─── Find member's area/asha ownership (for access control) ───────────────────
// Returns the area_id and asha_id that own the family_member so the service
// can verify the requesting ASHA belongs to the same area.
export const findMemberContext = async (
    memberId: string,
    client: PoolClient
) => {
    const query = `
    SELECT fm.id, f.phc_id, f.area_id, f.asha_id
    FROM family_members fm
    JOIN families f ON f.id = fm.family_id
    WHERE fm.id = $1 AND fm.is_active = true AND f.is_active = true;
  `;
    const result = await client.query(query, [memberId]);
    return result.rows[0] ?? null;
};

// ─── Update (optimistic locking) ──────────────────────────────────────────────
export const updateHealthRecord = async (
    id: string,
    fields: {
        data_json?: Record<string, unknown>;
        task_id?: string | null;
        last_modified_by: string;
        last_modified_role: string;
        last_modified_device: string;
        device_id: string;
        device_updated_at: string;
        synced_at?: string | null;
    },
    currentVersion: number,
    client: PoolClient
) => {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    // Optional fields – only set when provided
    if (fields.data_json !== undefined) {
        setClauses.push(`data_json = $${idx++}`);
        values.push(JSON.stringify(fields.data_json));
    }
    if (fields.task_id !== undefined) {
        setClauses.push(`task_id = $${idx++}`);
        values.push(fields.task_id);
    }
    if (fields.synced_at !== undefined) {
        setClauses.push(`synced_at = $${idx++}`);
        values.push(fields.synced_at);
    }

    // Always update audit + device + version + timestamp
    setClauses.push(`last_modified_by = $${idx++}`);
    values.push(fields.last_modified_by);

    setClauses.push(`last_modified_role = $${idx++}`);
    values.push(fields.last_modified_role);

    setClauses.push(`last_modified_device = $${idx++}`);
    values.push(fields.last_modified_device);

    setClauses.push(`device_id = $${idx++}`);
    values.push(fields.device_id);

    setClauses.push(`device_updated_at = $${idx++}`);
    values.push(fields.device_updated_at);

    setClauses.push(`version = version + 1`);
    setClauses.push(`updated_at = NOW()`);

    // Optimistic lock: WHERE id = $n AND version = $m AND is_active = true
    values.push(id);
    const idIdx = idx++;
    values.push(currentVersion);
    const versionIdx = idx++;

    const query = `
    UPDATE health_records
    SET ${setClauses.join(", ")}
    WHERE id = $${idIdx} AND version = $${versionIdx} AND is_active = true
    RETURNING *;
  `;

    const result = await client.query(query, values);
    return result.rows[0] ?? null;
};

// ─── Soft delete ───────────────────────────────────────────────────────────────
export const softDeleteHealthRecord = async (
    id: string,
    lastModifiedBy: string,
    lastModifiedRole: string,
    lastModifiedDevice: string,
    client: PoolClient
) => {
    const query = `
    UPDATE health_records
    SET
      is_active = false,
      last_modified_by = $2,
      last_modified_role = $3,
      last_modified_device = $4,
      updated_at = NOW()
    WHERE id = $1 AND is_active = true
    RETURNING *;
  `;
    const result = await client.query(query, [
        id,
        lastModifiedBy,
        lastModifiedRole,
        lastModifiedDevice,
    ]);
    return result.rows[0] ?? null;
};

// ─── Workflow transition ───────────────────────────────────────────────────────
export const updateHealthRecordWorkflow = async (
    id: string,
    newStatus: string,
    lastModifiedBy: string,
    lastModifiedRole: string,
    lastModifiedDevice: string,
    deviceId: string,
    deviceUpdatedAt: string,
    currentVersion: number,
    client: PoolClient
) => {
    const query = `
    UPDATE health_records
    SET
      workflow_status = $1,
      last_modified_by = $2,
      last_modified_role = $3,
      last_modified_device = $4,
      device_id = $5,
      device_updated_at = $6,
      version = version + 1,
      updated_at = NOW()
    WHERE id = $7 AND version = $8 AND is_active = true
    RETURNING *;
  `;
    const result = await client.query(query, [
        newStatus,
        lastModifiedBy,
        lastModifiedRole,
        lastModifiedDevice,
        deviceId,
        deviceUpdatedAt,
        id,
        currentVersion,
    ]);
    return result.rows[0] ?? null;
};
