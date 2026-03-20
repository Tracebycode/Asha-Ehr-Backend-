import { NextFunction, Request, Response } from "express";
import AppError from "../../utils/Apperror";
import { syncRequestSchema } from "./sync.schema";

/**
 * Validate and coerce the incoming sync request body against the Zod schema.
 * On failure, throws a 400 AppError with the first Zod issue as context.
 * 
 * 
 * 
 * 
 */


export const validateSyncRequest = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    try {
        const parsed = syncRequestSchema.parse(req.body);
        req.body = parsed;
        next();
    } catch (error: any) {
        const message =
            error?.errors?.[0]?.message ?? "Invalid sync request body";
        throw new AppError(message, 400);
    }
};
