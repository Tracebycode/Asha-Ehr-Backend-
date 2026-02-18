import { NextFunction, Request, Response } from "express";
import AppError from "../../utils/Apperror";
import {
    createMemberSchema,
    updateMemberSchema,
    workflowMemberSchema,
} from "./member.schema";

export const validateCreateMember = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const result = createMemberSchema.parse(req.body);
        req.body = result;
        next();
    } catch (error) {
        throw new AppError("Invalid request body", 400);
    }
};

export const validateUpdateMember = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const result = updateMemberSchema.parse(req.body);
        req.body = result;
        next();
    } catch (error) {
        throw new AppError("Invalid request body", 400);
    }
};

export const validateMemberWorkflow = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const result = workflowMemberSchema.parse(req.body);
        req.body = result;
        next();
    } catch (error) {
        throw new AppError("Invalid request body", 400);
    }
};
