import { assignareaSchema } from "./area.schema";
import { NextFunction, Request, Response } from "express";

export const validateareaassignment = ( req:Request,res:Response,next:NextFunction)=>{
    try{
        const result = assignareaSchema.parse(req.body);
        req.body = result;
        next();
    }
    catch(error){
        next(error);
    }
    

}
