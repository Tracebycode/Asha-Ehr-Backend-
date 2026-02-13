import { userType } from "./users.types";
import { createUser } from "./users.repository";
import { hashPassword } from "../../lib/password";
import { userdecoded } from "./users.types";
import pool from "../../lib/db";
import AppError from "../../utils/Apperror";

export const createUserService = async (Payload: userType, user:userdecoded) => {
    const client = await pool.connect();
    try{
        client.query('begin');
        const hashedPassword = await hashPassword(Payload.password);
        if(Payload.role === "phc_admin"){
            Payload.authority_level = 1;
            
        }else if(Payload.role === "doctor"){
            Payload.authority_level = 2;
        }else if(Payload.role === "anm"){
            Payload.authority_level = 3;
        }else if(Payload.role === "asha"){
            Payload.authority_level = 4;
        }
        
        
        const result = await createUser({ password: hashedPassword}, client);
        client.query('commit');
        return result;
    }
    catch(error){
        client.query('rollback');
        throw new AppError("Failed to create user", 500);
    }finally{
        client.release();
    }
}