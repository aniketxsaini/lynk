import dns from "node:dns"
dns.setServers(["1.1.1.1", "8.8.8.8"]);
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
export const connectToMongoDB=async()=>{
    try{
        await mongoose.connect(process.env.MONGODB_URI!);
        console.log("mongodb connected");
    }catch(error){
        console.log("error connecting mongodb ",error);
        process.exit(1);
    }
};
