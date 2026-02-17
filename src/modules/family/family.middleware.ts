import { NextFunction, Request, Response } from "express";
import { createFamilySchema } from "./family.schema";
import AppError from "../../utils/Apperror";









export const validateFamily = (req: Request, res: Response, next: NextFunction) => {
  try{
    const result = createFamilySchema.parse(req.body);
    req.body = result;
    next();
  }catch(error){
    throw new AppError("Invalid request body", 400);
  }
};
