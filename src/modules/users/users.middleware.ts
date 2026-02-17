import { NextFunction, Request, Response } from "express";
import { createUserSchema } from "./users.schema";
import AppError from "../../utils/Apperror";










export const validateCreateUser = async(req: Request, res: Response, next: NextFunction) => {
    try{
        await createUserSchema.parseAsync(req.body);
        next();
    }
    catch(error){
        throw new AppError("Invalid request body", 400);
    }
}