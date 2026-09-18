import express from "express";
const router = express.Router();
import {createShortUrlController,urlRedirectController,deleteUrlController} from "../controllers/url.controller.js";
import {authMiddleware} from "../middlewares/auth.middleware.js"
router.post('/short',authMiddleware,createShortUrlController);
router.get('/get/:shortCode',urlRedirectController);
router.delete('/delete/:shortCode',deleteUrlController);
export default router;


