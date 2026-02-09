import AuthRepository from "./auth.repository";
import { ClientPool } from "pg";
import { comparePassword } from "../../lib/password";
import { generateAccessToken } from "../../utils/jwt";
import AppError from "../../utils/Apperror";
import { LoginType } from "./auth.types";




class AuthService {
    static client = pool.connect();

   async login(user: LoginType){
    try{
        const client = await this.client;
        client.query('begin');
        const result = await AuthRepository.findUser(user,client);
        if(result.rows.length === 0){
            throw new AppError("User not found", 404);
        }
        const user = result.rows[0];
        const isPasswordValid = await comparePassword(user.password, user.password_hash);
        if(!isPasswordValid){
            throw new AppError("Invalid password", 401);
        }
        const payload = {
            id: user.id,
            role: user.role,
            phc_id: user.phc_id
        };
        const token = generateAccessToken(payload);
        return token;
    }
    catch(error){
        throw error;
    }
   }

    
    
}

export default AuthService;