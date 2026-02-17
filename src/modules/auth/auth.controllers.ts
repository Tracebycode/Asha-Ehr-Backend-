import { loginservice } from "./auth.services";
import { Request, Response,NextFunction } from "express";

export const loginController = async (req: Request, res: Response,next:NextFunction) => {
    try{
        const token = await loginservice(req.body);
        res.status(200).json({
            success: true,
            token
        });
    }
    catch(error){
        next(error);
    }
}