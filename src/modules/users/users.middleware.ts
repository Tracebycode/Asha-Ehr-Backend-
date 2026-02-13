import { NextFunction, Request, Response } from "express";
import { createUserSchema } from "./users.schema";
import AppError from "../../utils/Apperror";
import {verifyAccessToken} from "../../utils/jwt";


export const authenticateheader = (req: Request, res: Response, next: NextFunction) => {
  try {

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError("Unauthorized", 401);
    }

    const token = authHeader.split(" ")[1];

    const decodedToken = verifyAccessToken(token);

    req.user = decodedToken;

    next();

  } catch (error) {
    next(error);
  }
};



export const authorizeRole = (role: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if(req.user.role !== role){
            throw new AppError("Unauthorized", 401);
        }
        next();
    }
}



export const validateCreateUser = async(req: Request, res: Response, next: NextFunction) => {
    try{
        await createUserSchema.parseAsync(req.body);
        next();
    }
    catch(error){
        throw new AppError("Invalid request body", 400);
    }
}