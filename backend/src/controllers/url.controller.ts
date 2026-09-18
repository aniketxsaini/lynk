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