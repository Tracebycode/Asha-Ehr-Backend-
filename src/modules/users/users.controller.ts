import { NextFunction, Request, Response } from "express";
import { createUserService } from "./users.services";

export const createUserController = async (req: Request, res: Response, next: NextFunction) => {
    try{
        const result = await createUserService(req.body);
        res.status(200).json({
            success: true,
            message: "User created successfully",
            data: result
        });
    }
    catch(error){
        next(error);
    }
}