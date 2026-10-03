import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import {connectToMongoDB} from "../src/config/mongodb.config.js"
import redis from "../src/config/redis.js";
import {Urls} from "../src/models/url.model.js";
import {genrateShortCode} from "../src/utils/genrateShortCode.utils.js";
import fs from "fs";
import path from "path";
import {fileURLToPath} from "url";
import { MultiErrorReply } from "redis";


const COUNT = 500;
const BENCHMARK_USER_ID = "benchmark_test_user";

const __filename=fileURLToPath(import.meta.url);
const __dirname=path.dirname(__filename);

const OUTPUT_FILE = path.join(__dirname,"test-shortCode.json");

async function main(){
    const action = process.argv[2] || "seed";

    console.log(`\n initating helper function (Action:${action})`);
    await connectToMongoDB();
    await redis.connect();

    if(action==="seed"){
        console.log(`\nseeding ${COUNT} urls into MongoDB `);
        
        //cleaning previous benchmarking enteries
        await Urls.deleteMany({userId:BENCHMARK_USER_ID});
        
        const testUrls=[];
        const shortCodes=[];

        for(let i=0;i<COUNT;i++){
            const shortCode=genrateShortCode();
            shortCodes.push(shortCode);
            testUrls.push({
                originalUrl:`https://example.com/target-page-${i}`,
                shortCode,
                userId:BENCHMARK_USER_ID,
                clicks:0,
            });

        }

        await Urls.insertMany(testUrls);
        console.log(`successfully seeded ${COUNT} records in MongoDB`);

        fs.writeFileSync(OUTPUT_FILE,JSON.stringify(shortCodes,null,2));
        console.log(`short codes sabed to ${OUTPUT_FILE}`);
    }else if(action==="warm"){
        if(!fs.existsSync(OUTPUT_FILE)){
            console.error(`output file not found. please run seed first`);
            process.exit(1);
        }
        const shortCodes:string[]=JSON.parse(fs.readFileSync(OUTPUT_FILE,"utf-8"));
        console.log(`\n pre warming Redis with ${shortCodes.length} keys`);
        
        const multi=redis.multi();
        for(let i=0;i<shortCodes.length;i++){
            const code = shortCodes[i];
            multi.set(`url:${code}`,`https://example.com/target-page-${i}`,{EX:86400});
        }
        await multi.exec();
        console.log(` Redis warm-up complete! All ${shortCodes.length} keys are in-memory.`);
    }else if(action==="clear-cache"){
        if(!fs.existsSync(OUTPUT_FILE)){
            console.error(` Output file ${OUTPUT_FILE} not found.`);
            process.exit(1);
        }
        const shortCodes:string[]=JSON.parse(fs.readFileSync(OUTPUT_FILE,"utf-8"));
        console.log(`\n Clearing ${shortCodes.length} keys from redis`);

        const multi = redis.multi();
        for(let code of shortCodes){
            multi.del(`url:${code}`);
            multi.del(`clicks:${code}`);
        }
        await multi.exec();
        console.log(`cleared test keys from Redis. Ready for cold-cache / DB testing.`);

    }else if(action==="cleanup"){
        console.log(`\ncleaning up all benchmark test data...`);
        const result = await Urls.deleteMany({userId:BENCHMARK_USER_ID});
        console.log(`Deleted ${result.deletedCount} items from MongoDB`);

        if(fs.existsSync(OUTPUT_FILE)){
            const shortCodes:string[]=JSON.parse(fs.readFileSync("OUTPUT_FILE","utf-8"));
            const multi=redis.multi();
            for(let code of shortCodes){
                multi.del(`url:${code}`);
                multi.del(`clicks:${code}`);
            }
            await multi.exec();
            fs.unlinkSync(OUTPUT_FILE);
            console.log(`Removed ${OUTPUT_FILE} and flushed Redis keys.`);
            
        }
         console.log(` Cleanup complete.`);
        
    }

    await mongoose.disconnect();
    await redis.quit();
    process.exit(0);

}
main().catch((err) => {
    console.error("Error in benchmark script:", err);
    process.exit(1);
});

/*
TODO
--implement seed function to seed database
--add mongodb url to env
--modify the url controller to skip cache on demand for database benchmarking
also enbling or diabling the rate limit etc so the k6 dont get rate limited 
*/
