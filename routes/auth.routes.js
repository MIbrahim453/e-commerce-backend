import express from "express"
import { changePassword, forgotPassword, login, logout, refreshToken, register } from "../controllers/auth.controller.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"

const router = express.Router()
router.post("/register", register)
router.post("/login", login)
router.post("/logout", verifyJWT, logout)
router.post("/refresh-token", refreshToken)
router.post("/forgot-password", forgotPassword)
router.post("/reset-password/:token", changePassword)

export default router
