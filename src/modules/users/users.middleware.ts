import { NextFunction, Request, Response } from "express";
import { createUserSchema } from "./users.schema";
import AppError from "../../utils/Apperror";

export const validateCreateUser = (req: Request, res: Response, next: NextFunction) => {
    try{
        const result = createUserSchema.parse(req.body);
        next();
    }
    catch(error){
        throw new AppError("Invalid request body", 400);
    }
}