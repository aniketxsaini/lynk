import express,{Request,Response} from "express";
const server = express();
server.use(express.json());

server.get('/',(req:Request,res:Response)=>{
res.json({status:"ok"});
})

server.listen(3000,()=>{
    console.log("server is now running ");
});

