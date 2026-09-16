import express from "express";
const router = express.Router();
import {createShortUrlController,urlRedirectController} from "../controllers/url.controller.js";
import {authMiddleware} from "../middlewares/auth.middleware.js"
router.post('/short',authMiddleware,createShortUrlController);
router.get('/get/:shortCode',urlRedirectController);
export default router;


