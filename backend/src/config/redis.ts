
import { createClient } from "redis";

const redis = createClient({
    url: process.env.REDIS_URL!,
});

redis.on("error", (error) => {
    console.error("Redis Client Error:", error);
});

export default redis;