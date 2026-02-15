import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../../utils/jwt";
import { familySchema } from "./family.schema";


export const authenthicate =(req:Request,res:Response,next:NextFunction)=>{
 const header = req.headers.authorization;
 if(!header){
    return res.status(401).json({message:"Unauthorized"});
 }    
 const token = header.split(" ")[1];
 try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
 } catch (error) {
    return res.status(401).json({message:"Unauthorized"});
 }    
}



export const authorize = (role : string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({message:"Unauthorized"});
        }
        const userRole = req.user.role;
        if (userRole !== role) {
            return res.status(403).json({ message: "Forbidden" });
        }
        next();
    };
};




export const validateFamily = (req: Request, res: Response, next: NextFunction) => {
  try{
    const result = familySchema.parse(req.body);
    req.body = result;
    next();
  }catch(error){
    return res.status(400).json({ message: "Invalid request body" });
  }
};
