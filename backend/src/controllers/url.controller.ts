import { Request,Response } from "express";
import {genrateShortCode} from "../utils/genrateShortCode.utils.js"
import mongoose from "mongoose";
import {Urls} from '../models/url.model.js';
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
        const {originalUrl} = req.body;
        if(!originalUrl){
            return res.status(401).json({
                message:"please provide with a url to short",
            });
        }
        const shortCode = genrateShortCode();
        
        const newUrl = new Urls({
            originalUrl,
            shortCode,
            userId,
        });
        await newUrl.save();

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
}