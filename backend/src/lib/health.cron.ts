import cron from "node-cron";

export const job = cron.schedule("*/14 * * * *",async()=>{
    console.log("cron job started");
   try{
    const res = await fetch("https://lynk-vokw.onrender.com/health");
    console.log("status : ",res.status);
   }catch(error){
    console.log("cron job error",error);
   }
});
