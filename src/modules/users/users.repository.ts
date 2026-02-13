import { PoolClient } from "pg";
import { createUserType } from "./users.types";

export const createUser = async (user: createUserType, client: PoolClient) => {
    const query = `
        INSERT INTO users (name, phone, gender, dob, education_level, role, authority_level, phc_id, password_hash, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `;
    const values = [
        user.name,
        user.phone,
        user.gender,
        user.dob,
        user.education_level,
        user.role,
        user.authority_level,
        user.phc_id,
        user.password,
        user.created_by,
       
    ];
    const result = await client.query(query, values);
    return result;
}