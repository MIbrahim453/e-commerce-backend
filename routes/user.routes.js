import express from "express";
import { getMe, updateProfile } from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/me", verifyJWT, getMe);
router.put("/update-profile", verifyJWT, updateProfile);

export default router;
