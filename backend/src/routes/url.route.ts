import express from "express";
const router = express.Router();
import {createShortUrlController,urlRedirectController,deleteUrlController} from "../controllers/url.controller.js";
import {authMiddleware} from "../middlewares/auth.middleware.js"
import { rateLimiterMiddleware } from "../middlewares/rateLimit.middleware.js";
router.post('/short',authMiddleware,createShortUrlController);
router.get('/get/:shortCode',rateLimiterMiddleware,urlRedirectController);
router.delete('/delete/:shortCode',authMiddleware,deleteUrlController);
export default router;


