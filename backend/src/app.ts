import express,{Request,Response} from "express";
export const app = express();
app.use(express.json());

app.get('/',(req:Request,res:Response)=>{
res.json({status:"ok"});
});
app.get('/health',(req:Request,res:Response)=>{
res.json({status:"ok health check"});
});
export default app;
