import { Request,Response,NextFunction } from "express";
import  Jwt  from "jsonwebtoken";
import { lynkJwtPayload } from "../types/auth.types.js";

export const authMiddleware = async(
    req:Request,
    res:Response,
    next:NextFunction
)=>{
    try{
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(" ")[1];

        if(!token){
            return res.status(401).json({
                message:"authntication token not found please login again",
            });
        }
        const decoded = Jwt.verify(token,process.env.JWT_SEC_KEY!) as lynkJwtPayload;

        
        if(typeof decoded === "string"){
            return res.status(401).json({
                message:"invalid token",
            });
        }
        req.userId = decoded.userId;
        next();


    }catch(error){
        console.log("auth middleware error",error);
        return res.status(500).json({
            message:"invalid or expired token",
        });
    }
}



