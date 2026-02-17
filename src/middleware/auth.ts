import { verifyAccessToken } from "../utils/jwt";
import { Request, Response, NextFunction } from "express";
import AppError from "../utils/Apperror";



export const authenticateheader = (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header)
    throw new AppError("Missing Authorization header", 401);

  const token = header.split(" ")[1];

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (err) {
    throw new AppError("Invalid token or token expired", 401);
  }
};


export const authorize = (role : string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            throw new AppError("Unauthorized", 401);
        }
        const userRole = req.user.role;
        if (userRole !== role) {
            throw new AppError("Forbidden", 403);
        }
        next();
    };
};
