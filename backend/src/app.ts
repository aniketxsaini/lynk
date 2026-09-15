import express,{Request,Response} from "express";
export const app = express();
import userRoute from "./routes/user.route.js";
app.use(express.json());

app.use('/user',userRoute);

app.get('/health',(req:Request,res:Response)=>{
res.json({status:"ok health check"});
});

export default app;
