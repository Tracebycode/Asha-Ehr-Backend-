import { LoginType } from "./auth.types";
import { ClientPool } from "pg";

class AuthRepository {

    async findUser(user: LoginType,client:ClientPool){
        const query = `
            SELECT * FROM users(
            phone,
            is_active,
            status    
            )
            values(
                $1,
                $2,
                $3,
                $4
            )
        `;

        const values = [
            user.phone,
            true,
            'active'
        ];

        const result = await client.query(query, values);
        return result.rows[0];
    }
    
}

export default AuthRepository;