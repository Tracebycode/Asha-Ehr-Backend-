import { userType } from "./users.types";
import { createUser } from "./users.repository";
import { hashPassword } from "../../lib/password";
import pool from "../../lib/db";

export const createUserService = async (user: userType) => {
    const client = await pool.connect();
    try{
        client.query('begin');
        const hashedPassword = await hashPassword(user.password_hash);
        const result = await createUser({...user, password_hash: hashedPassword}, client);
        client.query('commit');
        return result;
    }
    catch(error){
        client.query('rollback');
        throw error;
    }
}