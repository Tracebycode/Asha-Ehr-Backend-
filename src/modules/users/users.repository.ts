import { PoolClient } from "pg";
import { userType } from "./users.types";

export const createUser = async (user: userType, client: PoolClient) => {
    const query = `
        INSERT INTO users (name, phone, gender, dob, education_level, role, authority_level, phc_id, password_hash, created_by, approved_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
        user.password_hash,
        user.created_by,
        user.approved_by
    ];
    const result = await client.query(query, values);
    return result;
}