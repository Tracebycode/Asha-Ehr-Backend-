import { NextFunction, Request, Response } from "express";
import { userjwtType } from "../../types/userjwt";
import { processSyncService } from "./sync.service";
import { SyncRequestBody } from "./sync.types";



export const syncController = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const user = req.user as userjwtType;
        const body = req.body as SyncRequestBody;

        const result = await processSyncService(body, user.userid, user.role);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};


