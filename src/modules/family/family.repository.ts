import { PoolClient } from "pg";

export const createFamily = async (family: any, client: PoolClient) => {
    const query = `
        INSERT INTO families (phc_id, area_id, asha_id, head_member_id, address_line, landmark, version, last_modified_by, last_modified_role, last_modified_device, workflow_status, device_created_at, device_updated_at, synced_at, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *;
    `;
    const values = [
        family.phc_id,
        family.area_id,
        family.asha_id,
        family.head_member_id,
        family.address_line,
        family.landmark,
        family.last_modified_by,
        family.last_modified_role,
        family.last_modified_device,
        family.workflow_status,
        family.device_created_at,
        family.device_updated_at,
        family.synced_at,
        family.is_active,
      
    ];
    const result = await client.query(query, values);
    return result.rows[0];
};



export const findAreaByUserId = async (userid: string, client: PoolClient) => {
    const query = `
        SELECT * FROM user_area_map WHERE user_id = $1;
    `;
    const result = await client.query(query, [userid]);
    return result.rows[0];
};