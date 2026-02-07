import { UserRegisterType } from "./auth.types";
import { ClientPool } from "pg";

class AuthRepository {

    async registerUser(user: UserRegisterType,client:ClientPool){
        const query = `
            INSERT INTO users (
                name,
                phone,
                password_hash,
                gender,
                dob,
                education_level,
                role,
                authority_level,
                phc_id,
                status,
                created_by
            )
            VALUES (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7,
                $8,
                $9,
                $10
            )
        `;

        const values = [
            user.name,
            user.phone,
            user.password,
            user.gender,
            user.dob,
            user.education_level,
            user.role,
            user.authority_level,
            user.phc_id,
            user.status,
            user.created_by
        ];

        const result = await client.query(query, values);
        return result.rows[0];
    }
    
}

export default AuthRepository;