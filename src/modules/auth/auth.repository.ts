import { LoginType } from "./auth.types";
import { PoolClient } from "pg";

export const findUser = async (user: LoginType, client: PoolClient) => {
    const query = `
        SELECT * FROM users
        WHERE phone = $1
        AND is_active = $2
        AND status = $3
    `;

    const values = [
        user.phone,
        true,
        'active'
    ];

    const result = await client.query(query, values);
    return result;
}

export default { findUser };
