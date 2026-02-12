import { NextFunction, Request, Response } from "express";
import { createUserSchema } from "./users.schema";
import AppError from "../../utils/Apperror";
import {verifyAccessToken} from "../../utils/jwt";


export const authenticateheader = (req: Request, res: Response, next: NextFunction) => {
    try{
        const token = req.headers.authorization;
        if(!token){
            throw new AppError("Unauthorized", 401);
        }
        const decodedToken = verifyAccessToken(token);
        req.user = decodedToken;
        next();
    }
    catch(error){
     throw error;
    }
}


export const authorizeRole = (role: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if(req.user.role !== role){
            throw new AppError("Unauthorized", 401);
        }
        next();
    }
}



export const validateCreateUser = (req: Request, res: Response, next: NextFunction) => {
    try{
        const result = createUserSchema.parse(req.body);
        next();
    }
    catch(error){
        throw new AppError("Invalid request body", 400);
    }
}