import AppError from "../utils/Apperror";
import { NextFunction, Request, Response } from "express";


export const globalErrorHandler = (err: AppError, req: Request, res: Response, next: NextFunction) => {
    if(err instanceof AppError){
        return res.status(err.statusCode).json({
            message: err.message,
            errors: err.errors,
        });
    }
    return res.status(500).json({
        message: "Internal Server Error",
    });
};