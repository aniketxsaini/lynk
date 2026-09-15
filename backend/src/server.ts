import app from "./app.js";
import {connectToMongoDB} from "./config/mongodb.config.js"
const PORT = process.env.PORT || 3000;

const serverStart = async()=>{
    await connectToMongoDB();
    app.listen(PORT,()=>{
    console.log("server is now running ");
});
};

serverStart();


