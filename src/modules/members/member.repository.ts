import { PoolClient } from "pg";
import { MemberType } from "./member.types";

// ─── Create ────────────────────────────────────────────────────────────────────
export const createMember = async (member: MemberType, client: PoolClient) => {
    const query = `
    INSERT INTO family_members (
      family_id, phc_id, area_id, asha_id,
      full_name, gender, date_of_birth, relation_to_head,
      aadhaar_number, mobile_number,
      last_modified_by, last_modified_role, last_modified_device,
      synced_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING *;
  `;
    const values = [
        member.family_id,
        member.phc_id,
        member.area_id,
        member.asha_id,
        member.full_name,
        member.gender,
        member.date_of_birth,
        member.relation_to_head,
        member.aadhaar_number ?? null,
        member.mobile_number ?? null,
        member.last_modified_by,
        member.last_modified_role,
        member.last_modified_device,
        member.synced_at,
    ];
    const result = await client.query(query, values);
    return result.rows[0];
};

// ─── Find by ID ────────────────────────────────────────────────────────────────
export const findMemberById = async (id: string, client: PoolClient) => {
    const query = `
    SELECT * FROM family_members
    WHERE id = $1 AND is_active = true;
  `;
    const result = await client.query(query, [id]);
    return result.rows[0] ?? null;
};

// ─── Check Aadhaar uniqueness (partial index – only active records) ────────────
export const findMemberByAadhaar = async (
    aadhaar: string,
    excludeId: string | null,
    client: PoolClient
) => {
    const query = excludeId
        ? `SELECT id FROM family_members WHERE aadhaar_number = $1 AND is_active = true AND id <> $2 LIMIT 1;`
        : `SELECT id FROM family_members WHERE aadhaar_number = $1 AND is_active = true LIMIT 1;`;

    const values = excludeId ? [aadhaar, excludeId] : [aadhaar];
    const result = await client.query(query, values);
    return result.rows[0] ?? null;
};

// ─── Update ────────────────────────────────────────────────────────────────────
export const updateMember = async (
    id: string,
    fields: {
        full_name?: string;
        gender?: string;
        date_of_birth?: string;
        relation_to_head?: string;
        aadhaar_number?: string | null;
        mobile_number?: string | null;
        last_modified_by: string;
        last_modified_role: string;
        last_modified_device: string;
        device_updated_at: string;
    },
    currentVersion: number,
    client: PoolClient
) => {
    // Build SET clause dynamically from provided optional fields
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    const optionalFields: (keyof typeof fields)[] = [
        "full_name",
        "gender",
        "date_of_birth",
        "relation_to_head",
        "aadhaar_number",
        "mobile_number",
    ];

    for (const key of optionalFields) {
        if (fields[key] !== undefined) {
            setClauses.push(`${key} = $${idx++}`);
            values.push(fields[key]);
        }
    }

    // Always update audit + version + timestamps
    setClauses.push(`last_modified_by = $${idx++}`);
    values.push(fields.last_modified_by);

    setClauses.push(`last_modified_role = $${idx++}`);
    values.push(fields.last_modified_role);

    setClauses.push(`last_modified_device = $${idx++}`);
    values.push(fields.last_modified_device);

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
    UPDATE family_members
    SET ${setClauses.join(", ")}
    WHERE id = $${idIdx} AND version = $${versionIdx} AND is_active = true
    RETURNING *;
  `;

    const result = await client.query(query, values);
    return result.rows[0] ?? null;
};

// ─── Soft delete ───────────────────────────────────────────────────────────────
export const softDeleteMember = async (
    id: string,
    lastModifiedBy: string,
    lastModifiedRole: string,
    lastModifiedDevice: string,
    client: PoolClient
) => {
    const query = `
    UPDATE family_members
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
export const updateMemberWorkflow = async (
    id: string,
    newStatus: string,
    lastModifiedBy: string,
    lastModifiedRole: string,
    lastModifiedDevice: string,
    deviceUpdatedAt: string,
    currentVersion: number,
    client: PoolClient
) => {
    const query = `
    UPDATE family_members
    SET
      workflow_status = $1,
      last_modified_by = $2,
      last_modified_role = $3,
      last_modified_device = $4,
      device_updated_at = $5,
      version = version + 1,
      updated_at = NOW()
    WHERE id = $6 AND version = $7 AND is_active = true
    RETURNING *;
  `;
    const result = await client.query(query, [
        newStatus,
        lastModifiedBy,
        lastModifiedRole,
        lastModifiedDevice,
        deviceUpdatedAt,
        id,
        currentVersion,
    ]);
    return result.rows[0] ?? null;
};

// ─── Lookup family (to inherit phc_id / area_id / asha_id) ───────────────────
export const findFamilyById = async (familyId: string, client: PoolClient) => {
    const query = `
    SELECT id, phc_id, area_id, asha_id
    FROM families
    WHERE id = $1 AND is_active = true;
  `;
    const result = await client.query(query, [familyId]);
    return result.rows[0] ?? null;
};
