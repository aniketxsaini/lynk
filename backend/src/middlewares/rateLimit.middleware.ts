import {Request,Response,NextFunction} from "express";
import redis from "../config/redis.js";

const WINDOW_SIZE = Number(process.env.RATE_LIMIT_WINDOW) || 60;
const MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX) || 1000;
const DISABLE_RATE_LIMIT = process.env.DISABLE_RATE_LIMIT === "true";

export const rateLimiterMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (DISABLE_RATE_LIMIT) {
        return next();
    }
    try{
        const ip=req.ip;
        if(!ip){
            return res.status(400).json({
                message:"unable to identify client",
            });
        }
        const key = `rate:${ip}`;

        const currentRequests = await redis.incr(key);

        if(currentRequests===1){
            await redis.expire(key,WINDOW_SIZE);
        }

        if(currentRequests>MAX_REQUESTS){
            return res.status(429).json({
                message:"too many requests. please try again later",
            });
        }

        next();

    }catch(error){
        console.log("rate Limit middleware error",error);
        return res.status(500).json({
            message:"internal server error",
        });
    }
}
