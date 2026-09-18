import { Request,Response } from "express";
import {genrateShortCode} from "../utils/genrateShortCode.utils.js"
import mongoose from "mongoose";
import {Urls} from '../models/url.model.js';
import { url } from "node:inspector";
import redis from "../config/redis.js";
export const createShortUrlController = async(
    req:Request,
    res:Response
)=>{
    try{
        const userId = req.userId;
        if(!userId){
            return res.status(401).json({
                message:"user not defined please try again",
            });
        }
        let {originalUrl} = req.body;
        
        if(!originalUrl){
            return res.status(401).json({
                message:"please provide with a url to short",
            });
        }

        if (!originalUrl.startsWith("http://") && !originalUrl.startsWith("https://")) {
            originalUrl = "https://" + originalUrl;
        }
        const shortCode = genrateShortCode();
        
        const newUrl = new Urls({
            originalUrl,
            shortCode,
            userId,
        });
        await newUrl.save();
        await redis.set(
            `url:${shortCode}`,
            originalUrl!,
            {
                EX:86400,
            }
        );

        console.log(newUrl);

        return res.status(201).json({
            message:`${shortCode} generated\n `,
        });
    }catch(error){
        console.log("url controller error",error);
        return res.status(500).json({
            message:"internal server error",
        });
    }
};

export const urlRedirectController = async(
    req:Request,
    res:Response
)=>{
    try{
        const shortCode=req.params.shortCode;
        if(!shortCode){
            return res.status(400).json({
                message:"Short code is required",
            });
        }
        const cachedUrl = await redis.get(`url:${shortCode}`);
        if(cachedUrl){
            console.log(`redis cache HIT url:${shortCode}`);
            await redis.incr(`clicks:${shortCode}`);
            await redis.sAdd("pending:clicks",shortCode);
            return res.redirect(cachedUrl!);
        }else{
            console.log(`redis cache MISS url:${shortCode}`)
        }
        const url = await Urls.findOne({shortCode:shortCode});
        if(!url){
            return res.status(401).json({
                message:"Short URL not found",
            });
        }
        await redis.set(
            `url:${shortCode}`,
            url.originalUrl!,
            {
                EX:86400,
            }
        )
        await redis.incr(`clicks:${shortCode}`);
        await redis.sAdd("pending:clicks",shortCode);
        console.log(url.originalUrl);
        return res.redirect(url.originalUrl!);

    }catch(error){
        console.log("url redirect logic error");
        return res.status(500).json({
            message:"internal server error",
        });
    }
};

export const deleteUrlController = async(
    req:Request,
    res:Response
)=>{
    try{
        const shortCode = req.params.shortCode;
        const userId = req.userId;
        if(!shortCode){
            return res.status(400).json({
                message:'please provide url id to delete',
            });
        }
        if(!userId){
            return res.status(400).json({
                message:"authentication required please loggin",
            })
        }
        const url = await Urls.findOne({shortCode});
        if(!url){
            return res.status(400).json({
                message:"given url not found",
            });
        }
        if(userId!==url.userId){
            return res.status(400).json({
                message:"you are not authorized to perform this task",
            });
        }
        const redisCache = await redis.get(`url:${shortCode}`);
        if(redisCache){
            await redis.del(`url:${shortCode}`);
            console.log(`cache deleted ${redisCache}`);
        }
        const pendingClicks=await redis.get(`clicks:${shortCode}`);
        if(pendingClicks){
            await Urls.updateOne({shortCode},{$inc:{clicks:Number(pendingClicks)}});
            redis.del(`clicks:${shortCode}`);
            console.log(`${Number(pendingClicks)} pending clicks deleted for ${shortCode}`);
        }
        await Urls.deleteOne({shortCode});
        console.log("url deleted from database");
        return res.status(200).json({
            message:`succesfully deleted ${shortCode}`
        });
    }catch(error){
        console.log("delete url conntroller error",error);
        return res.status(500).json({
            message:'interval server error',
        })
    }
};