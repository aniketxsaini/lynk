import express from "express";
const router = express.Router();
import {createShortUrlController} from "../controllers/url.controller.js";
import {authMiddleware} from "../middlewares/auth.middleware.js"
router.post('/short',authMiddleware,createShortUrlController);
export default router;


