import mongoose from "mongoose";
const urlSchema = new mongoose.Schema({
    originalUrl:{
        type:String,
        require:true,
    },
    shortCode:{
        type:String,
        required:true,
        unique:true,
    },
    userId:{
        type:String,
        required:true,
    },
    clicks:{
        type:Number,
        default:0,
    },
    
},{timestamps:true,});

export const Url = mongoose.model("Url",urlSchema);