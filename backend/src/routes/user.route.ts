import express from "express";
const router = express.Router();
import {registerController,loginController} from "../controllers/user.controller.js";
//implement authentication middleware
//user/register user/login
router.post('/register',registerController);
router.post('/login',loginController);

export default router;