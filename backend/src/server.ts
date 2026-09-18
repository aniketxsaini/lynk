import app from "./app.js";
import {connectToMongoDB} from "./config/mongodb.config.js";
import {pool} from "./config/pg.config.js";
import redis from "./config/redis.js";
import {syncPendingClicks} from "./services/clickSync.service.js"
const PORT = process.env.PORT || 3000;


const serverStart = async()=>{
    await pool.connect();
    await connectToMongoDB();
    await redis.connect();

    setInterval(syncPendingClicks,30_000);

    app.listen(PORT,()=>{
    console.log("server is now running ");
});
};

serverStart();


