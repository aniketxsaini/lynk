import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../config/pg.config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationsPath = path.join(__dirname,"migrations");

const runMigrations = async()=>{
    const files = fs
        .readdirSync(migrationsPath)
        .filter((file)=>file.endsWith(".sql"))
        .sort();

    for(const file of files){
        const sql=fs.readFileSync(
            path.join(migrationsPath,file),
            "utf-8"

        );

        console.log(`running ${file}...`);
        await pool.query(sql);
        console.log(`${file} completed`);
    }

    await pool.end;
};
runMigrations().catch((error)=>{
    console.log(error);
    process.exit(1);
});

