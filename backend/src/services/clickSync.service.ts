import redis from "../config/redis.js";
import {Urls} from "../models/url.model.js";

export const syncPendingClicks = async()=>{
    try{
        const shortCodes = await redis.sMembers("pending:clicks");
        if (shortCodes.length === 0){
            return;
        }
        for(const shortCode of shortCodes){
            const pendingClicks = await redis.getDel(`clicks:${shortCode}`);
            if(!pendingClicks){
                await redis.sRem("pending:clicks",shortCode);
                continue;
            }
            const clicks = Number(pendingClicks);

            await Urls.updateOne(
                {shortCode},
                {
                    $inc:{clicks}
                },
            );

            await redis.sRem("pending:clicks",shortCodes);
            
            console.log(
                `synced ${clicks} for ${shortCode}`
            );
        }
    }catch(error){
        console.error("click sync error",error);
    }
};