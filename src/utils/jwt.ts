import jwt from "jsonwebtoken";
import AppError from "./Apperror";
import { userdecoded } from "../modules/users/users.types";

const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;



export const generateRefreshToken = (payload: any) => {
    if(!refreshTokenSecret){
        throw new AppError("Refresh token secret not found", 500);
    }

    const token = jwt.sign(
        payload,
        refreshTokenSecret,
        { expiresIn: "7d" }
    );
    return token;
};


export const generateAccessToken = (payload: any) => {


    if(!accessTokenSecret){
        throw new AppError("Access token secret not found", 500);
    }
    const token = jwt.sign(
        payload,
        accessTokenSecret,
        { expiresIn: "15m" }
    );
    return token;
};



export const verifyRefreshToken = (token: string) => {
    if(!refreshTokenSecret){
        throw new AppError("Refresh token secret not found", 500);
    }
    const decoded = jwt.verify(token, refreshTokenSecret) ;
    return decoded;
};


export const verifyAccessToken = (token: string) => {
    if(!accessTokenSecret){
        throw new AppError("Access token secret not found", 500);
    }
    const decoded = jwt.verify(token, accessTokenSecret) as userdecoded;
    return decoded;
};
