import { NextFunction, Request, Response } from "express";
import { createUserService } from "./users.services";
import { userdecoded } from "./users.types";

export const createUserController = async (req: Request, res: Response, next: NextFunction) => {
    try{
        const result = await createUserService(req.body,req.user as userdecoded);
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