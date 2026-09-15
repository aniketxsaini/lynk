import app from "./app.js";
import {connectToMongoDB} from "./config/mongodb.config.js";
import {pool} from "./config/pg.config.js"
const PORT = process.env.PORT || 3000;

const serverStart = async()=>{
    await connectToMongoDB();
    await pool.connect();
    app.listen(PORT,()=>{
    console.log("server is now running ");
});
};

serverStart();


