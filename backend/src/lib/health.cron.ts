import cron from "node-cron";
console.log("health.cron.ts loaded");

export const job = cron.createTask("*/1 * * * *", async () => {
    console.log("CRON FIRED");

    try {
        const res = await fetch("https://lynk-vokw.onrender.com/health");
        console.log("Health status:", res.status);
    } catch (error) {
        console.error("Health check failed:", error);
    }
});