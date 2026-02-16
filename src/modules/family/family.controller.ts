import { createFamilyService } from "./family.services";
import { Request, Response,NextFunction } from "express";

export const createFamilyController = async (req:Request,res:Response,next:NextFunction)=>{

    try {
        const user = req.user;
        const family = await createFamilyService(req.body,user);
        return res.status(201).json({ message: "Family created successfully", family });
    } catch (error) {
        next(error);
    }
    
}

export const updateFamilyController = async (req:Request,res:Response)=>{
    
}

export const deleteFamilyController = async (req:Request,res:Response)=>{
    
}

export const getFamilyController = async (req:Request,res:Response)=>{
    
}

export const getAllFamiliesController = async (req:Request,res:Response)=>{
    
}
