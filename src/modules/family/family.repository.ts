import { PoolClient } from "pg";
import { familytype } from "./family.types";

export const createFamily = async (family: familytype, client: PoolClient) => {
    const query = `
        INSERT INTO families (phc_id, area_id, asha_id, head_member_id, address_line, landmark, last_modified_by, last_modified_role, last_modified_device, synced_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
        family.synced_at,
      
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