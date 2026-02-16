import AuthRepository from "./auth.repository";
import { comparePassword } from "../../lib/password";
import { generateAccessToken } from "../../utils/jwt";
import AppError from "../../utils/Apperror";
import { LoginType, Userdb } from "./auth.types";
import pool from "../../lib/db";




export const loginservice = async (LoginCredentials: LoginType) => {
    try{
        const client = await pool.connect();
        client.query('begin');
        const result:any = await AuthRepository.findUser(LoginCredentials,client);
        if(result.rows.length === 0){
            throw new AppError("User not found", 404);
        }
        const user:Userdb = result.rows[0];
        const isPasswordValid = await comparePassword(LoginCredentials.password, user.password_hash);
        if(!isPasswordValid){
            throw new AppError("Invalid password", 401);
        }
        const payload = {
            id: user.id,
            role: user.role,
            phc_id: user.phc_id,
            
        };
        const token = generateAccessToken(payload);
        return token;
    }
    catch(error){
        throw error;
    }
}