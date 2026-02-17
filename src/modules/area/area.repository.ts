import { PoolClient } from "pg";
import { assignareaType } from "./area.types";

export const assignarearepo = async (data:assignareaType,client:PoolClient)=>{
    const query = `insert into 
    user_area_map(
    user_id,
    area_id,
    phc_id,
    assigned_by,
    is_active)
    values($1,$2,$3,$4,$5)`;
    const values = [data.user_id, data.area_id,data.phc_id,data.assigned_by,true];
    const result = await client.query(query, values);
    return result.rows[0];
}


export const findAreaByUserId = async (userid: string, client: PoolClient) => {
    const query = `
        SELECT * FROM user_area_map WHERE user_id = $1;
    `;
    const result = await client.query(query, [userid]);
    return result.rows[0];
};
