import { NextFunction, Request, Response } from "express";
import AppError from "../../utils/Apperror";
import {
    createHealthRecordSchema,
    updateHealthRecordSchema,
    workflowHealthRecordSchema,
} from "./health.schema";

export const validateCreateHealthRecord = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const result = createHealthRecordSchema.parse(req.body);
        req.body = result;
        next();
    } catch (error) {
        throw new AppError("Invalid request body", 400);
    }
};

export const validateUpdateHealthRecord = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const result = updateHealthRecordSchema.parse(req.body);
        req.body = result;
        next();
    } catch (error) {
        throw new AppError("Invalid request body", 400);
    }
};

export const validateHealthRecordWorkflow = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const result = workflowHealthRecordSchema.parse(req.body);
        req.body = result;
        next();
    } catch (error) {
        throw new AppError("Invalid request body", 400);
    }
};
