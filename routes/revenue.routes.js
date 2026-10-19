import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import authorizedRole from "../middlewares/rbac.middleware.js";
import {
  revenueStats,
  getAllPayments,
  getUserPayments,
} from "../controllers/revenue.controller.js";

const router = express.Router();

router.get("/stats", verifyJWT, authorizedRole("admin"), revenueStats);

router.get("/all-payments", verifyJWT, authorizedRole("admin"), getAllPayments);

router.get(
  "/my-payments",
  verifyJWT,
  authorizedRole("user", "admin"),
  getUserPayments,
);

export default router;
