import { loginservice } from "./auth.services";
import { Request, Response,NextFunction } from "express";

export const loginController = async (req: Request, res: Response,next:NextFunction) => {
    try{
        const result = await loginservice(req.body);
        res.status(200).json({
            success: true,
            data: result
        });
    }
    catch(error){
        next(error);
    }
}