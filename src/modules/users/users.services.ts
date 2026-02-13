import { createUser } from "./users.repository";
import { hashPassword } from "../../lib/password";
import { userdecoded } from "./users.types";
import pool from "../../lib/db";
import AppError from "../../utils/Apperror";
import { createUserType , createuserPayloadtype} from "./users.types";

export const createUserService = async (Payload: createuserPayloadtype, user:userdecoded) => {
    const client = await pool.connect();
   try{
    client.query('begin');
    const hashedPassword = await hashPassword(Payload.password);
    const authority_level = getAuthorityLevel(Payload.role);
    const newUser: createUserType = {
        name: Payload.name,
        phone: Payload.phone,
        gender: Payload.gender,
        dob: Payload.dob,
        education_level: Payload.education_level,
        role: Payload.role,
        authority_level: authority_level,
        phc_id: user.phc_id,
        password: hashedPassword,
        created_by: user.id,
    };
    const result = await createUser(newUser, client);
    client.query('commit');
    return result;

   }catch(error){
    client.query('rollback');
    throw new AppError("Failed to create user", 500);
   }finally{
    client.release();
   }
}

const getAuthorityLevel = (role: string) => {
    switch(role){
        case "phc_admin":
            return 1;
        case "doctor":
            return 2;
        case "anm":
            return 3;
        case "asha":
            return 4;
        default:
            throw new AppError("Invalid role", 400);
    }
}