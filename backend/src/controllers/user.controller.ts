import {Request,Response} from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {pool} from "../config/pg.config.js";
import { RegisterRequest,LoginRequest } from "../types/user.types.js";

export const registerController = async(req:Request<{},{},RegisterRequest>,res:Response)=>{
    try{
        if(!req.body){
            return res.status(400).json({
                message:"username,email,password are required"
            });
        }
        const {username,email,password} = req.body;

        if(!username||!email||!password){
            return res.status(400).json({
                message:"username,email,password are required"
            });
        }

        const existingUser = await pool.query(
            `select id from users WHERE email = $1 OR username = $2`,
            [email,username]
        );

        if(existingUser.rows.length > 0){
            return res.status(409).json({
                message:"user already exists",
            });
        }

        const passwordHash = await bcrypt.hash(password,12);
        const result = await pool.query(
            `INSERT INTO users (username,email,password_hash)
            VALUES($1, $2, $3)
            RETURNING id,username,email,created_at`,
            [username,email,passwordHash]
        );

        const user=result.rows[0];

        const token = jwt.sign(
            {userId:user.id},
            process.env.JWT_SEC_KEY!,
            {expiresIn:'15m'}
        );
        return res.status(201).json({
            message:"user registered successfully",
            user,
            token,
        });

    }catch(error){
        console.log("register Controller error");
        console.error(error);
        return res.status(500).json({
            message:"internal server error",
        });
    }
};

export const loginController = async(req:Request<{},{},LoginRequest>,res:Response)=>{
    try{
         if(!req.body){
            return res.status(400).json({
                message:"email,password are required"
            });
        }
        const {email,password} = req.body;
        
        if(!email||!password){
            return res.status(400).json({
                message:"username and password are required",
            });
        }

        const result = await pool.query(
            `SELECT id,username,email,password_hash
            FROM users
            WHERE email = $1`,
            [email]
        );

        if(result.rows.length===0){
            return res.status(404).json({
                message:"user not found",
            });
        }

        const user = result.rows[0];
        const isPassMatch = await bcrypt.compare(password,user.password_hash);

        if(!isPassMatch){
            return res.status(401).json({
                message:"invalid credentials",
            });
        }

        const token = jwt.sign(
            {userId:user.id},
            process.env.JWT_SEC_KEY!,
            {expiresIn:"15m"}
        );

        return res.status(200).json({
            message:"loggin successful",
            user:{
                id:user.id,
                username:user.username,
                email:user.email,
            },
            token,
        });



    }catch(error){
        console.log("login controller error ");
        console.error(error);
        return res.status(500).json({
            message:"internal server error",
        });
    }
}








