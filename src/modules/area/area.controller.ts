import { NextFunction, Request, Response } from "express";
import { assignareaservice } from "./areas.services";
import { userjwtType } from "../../types/userjwt";




export const assignareacontroller = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        const data = req.body;
        const result = await assignareaservice(data, user as userjwtType);
        res.status(200).json({message:"Area assigned successfully",result});
    } catch (error) {
        next(error);
    }
};